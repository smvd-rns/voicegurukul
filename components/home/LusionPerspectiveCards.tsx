'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export default function LusionPerspectiveCards() {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const cards = [
    {
      id: '01',
      code: 'CRS-DYS',
      title: 'Discover Yourself',
      level: 'FOUNDATION • 6 MODULES',
      tagline: 'Scientific exploration of consciousness, mind mechanics, and conquering anxiety.',
      color: 'from-[#00f0ff]/20 to-[#1a2ffb]/20',
      border: 'hover:border-[#00f0ff]',
      accent: '#00f0ff',
      topics: [
        'Art of Mind Control & Positive Habits',
        'Scientific Evidence for Soul & Consciousness',
        'Why Do Bad Things Happen to Good People?',
        'Karma, Destiny & Free Will Mechanics',
        'Yoga for Modern Times & Sound Therapy',
      ],
    },
    {
      id: '02',
      code: 'CRS-STS',
      title: 'Stress to Strength',
      level: 'MIND MASTERY • 8 MODULES',
      tagline: 'Converting intense competitive academic pressure into unshakable peak focus.',
      color: 'from-[#f43f5e]/20 to-[#8832f7]/20',
      border: 'hover:border-[#f43f5e]',
      accent: '#f43f5e',
      topics: [
        'Overcoming Screen Addiction & Brain Fog',
        'Memory Enhancement & Exam Composure',
        'Emotional Resilience & Handling Failure',
        'Conflict Resolution & Authentic Friendships',
        'Circadian Rhythm & Energy Optimization',
      ],
    },
    {
      id: '03',
      code: 'CRS-VLE',
      title: 'Vedic Leadership',
      level: 'LEADERSHIP • 10 MODULES',
      tagline: 'Timeless governance & ethics from Ramayana and Chanakya Niti for future pioneers.',
      color: 'from-[#f59e0b]/20 to-[#ef4444]/20',
      border: 'hover:border-[#f59e0b]',
      accent: '#f59e0b',
      topics: [
        'Principle-Centered Leadership vs Ego Dynamics',
        'Servant Leadership in Corporate Environments',
        'Strategic Intuition Under High Uncertainty',
        'Building High-Trust, Synergistic Teams',
        'Sustainable Work-Life-Spiritual Balance',
      ],
    },
    {
      id: '04',
      code: 'CRS-BGF',
      title: 'Gita Fellowship',
      level: 'ADVANCED • 12 MODULES',
      tagline: 'Deep ontological wisdom of the Bhagavad Gita applied to modern science and philosophy.',
      color: 'from-[#c1ff00]/20 to-[#10b981]/20',
      border: 'hover:border-[#c1ff00]',
      accent: '#c1ff00',
      topics: [
        'The 5 Fundamental Truths of Existence',
        'Three Modes of Material Nature (Gunas)',
        'Bhakti Yoga as the Pinnacle of Wisdom',
        'Synthesizing Modern Science with Vedic Axioms',
        'Living a Life of Universal Compassion',
      ],
    },
  ];

  return (
    <section className="relative py-28 px-6 sm:px-10 lg:px-16 bg-transparent text-white overflow-hidden border-t border-white/10">
      
      {/* Telemetry and Crosshairs Header */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-xs font-mono text-[#c1ff00]">
              <span>[ 04 // SYSTEMATIC CURRICULUM ]</span>
              <span>•</span>
              <span>4 FOUNDATIONAL TIERS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none uppercase">
              CAPABILITY &amp; KNOWLEDGE SUITE
            </h2>
          </div>

          <p className="text-xs sm:text-sm font-mono text-white/50 max-w-md">
            Interactive sequential courses delivered at premier universities across India to cultivate character alongside competence.
          </p>
        </div>
      </div>

      {/* 3D Perspective Cards Grid */}
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6 perspective-[1200px]">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            whileHover={{ y: -10, rotateY: 4, scale: 1.02 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onMouseEnter={() => setActiveCard(idx)}
            onMouseLeave={() => setActiveCard(null)}
            className={`relative rounded-3xl border border-white/15 bg-gradient-to-b ${card.color} bg-black/50 p-6 sm:p-8 flex flex-col justify-between h-[490px] shadow-2xl backdrop-blur-xl transition-all duration-300 ${card.border} group`}
          >
            {/* Corner Crosshairs */}
            <span className="absolute top-4 left-4 text-white/20 font-mono text-xs">+</span>
            <span className="absolute top-4 right-4 text-white/20 font-mono text-xs">+</span>
            <span className="absolute bottom-4 left-4 text-white/20 font-mono text-xs">+</span>
            <span className="absolute bottom-4 right-4 text-white/20 font-mono text-xs">+</span>

            {/* Top metadata */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-white/50">
                <span style={{ color: card.accent }} className="font-bold">
                  {card.code}
                </span>
                <span>LEVEL {card.id}</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                  {card.level}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
                  {card.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-light">
                  {card.tagline}
                </p>
              </div>
            </div>

            {/* Middle Syllabus points with Lusion dot leaders */}
            <div className="space-y-2 py-4 my-auto border-y border-white/10">
              <span className="text-[10px] font-mono tracking-wider uppercase text-white/40 block">
                CORE MODULES:
              </span>
              {card.topics.map((t, tIdx) => (
                <div key={tIdx} className="flex items-center justify-between text-xs text-white/70">
                  <span className="truncate pr-2">{t}</span>
                  <span className="text-white/20 font-mono tracking-widest text-[10px] shrink-0">
                    ..........
                  </span>
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/40 group-hover:text-white transition-colors">
                ENROLL SCHOLAR
              </span>
              <Link
                href="/programmes"
                className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white group-hover:text-black text-white flex items-center justify-center transition-all duration-300 shadow-md"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

          </motion.div>
        ))}
      </div>

      {/* Curriculum Bottom Action Bar */}
      <div className="max-w-7xl mx-auto mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/10 pt-8 text-xs font-mono text-white/50">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-[#c1ff00]" />
          <span>ACCORDING TO VEDIC EDUCATION STANDARDS • OVER 5,000+ WORKSHOPS HOSTED</span>
        </div>

        <Link
          href="/programmes"
          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono font-bold tracking-wider uppercase transition-all flex items-center space-x-2"
        >
          <span>VIEW COMPLETE 8-TIER SYLLABUS</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </section>
  );
}

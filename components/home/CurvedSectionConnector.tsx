'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function CurvedSectionConnector() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
  });

  // Animate the SVG path length as user scrolls through this transition
  const pathLength = useTransform(smoothProgress, [0.15, 0.78], [0, 1]);
  const scale = useTransform(smoothProgress, [0.15, 0.5, 0.85], [0.96, 1.04, 0.98]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-56 sm:h-72 overflow-hidden flex items-center justify-center [perspective:1400px] z-20 pointer-events-none my-2"
    >
      {/* 3D Flowing Curved SVG Ribbon */}
      <motion.svg
        style={{ scale }}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 280"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Broad Luminous 3D Gradient for the Ribbon Curve */}
          <linearGradient id="boldCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="55%" stopColor="#f97316" stopOpacity="1" />
            <stop offset="85%" stopColor="#ea580c" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.75" />
          </linearGradient>

          {/* Deep Glowing Shadow Filter for Bold 3D Radiance */}
          <filter id="boldCurveGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Faint Background Guide Track */}
        <path
          d="M 60 15 C 380 230, 1020 40, 1380 265"
          stroke="#fed7aa"
          strokeWidth="3.5"
          strokeDasharray="10 8"
          opacity="0.4"
        />

        {/* Layer 1: Broad Ambient 3D Glowing Halo (Thick Radiant Beam) */}
        <motion.path
          d="M 60 15 C 380 230, 1020 40, 1380 265"
          stroke="url(#boldCurveGrad)"
          strokeWidth="20"
          strokeLinecap="round"
          filter="url(#boldCurveGlow)"
          opacity="0.32"
          style={{ pathLength }}
        />

        {/* Layer 2: Main Bold 3D Gradient Flow Line */}
        <motion.path
          d="M 60 15 C 380 230, 1020 40, 1380 265"
          stroke="url(#boldCurveGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          filter="url(#boldCurveGlow)"
          style={{ pathLength }}
        />

        {/* Layer 3: Intense Core Luminous Light Core */}
        <motion.path
          d="M 60 15 C 380 230, 1020 40, 1380 265"
          stroke="#fffbeb"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.85"
          style={{ pathLength }}
        />
      </motion.svg>
    </div>
  );
}

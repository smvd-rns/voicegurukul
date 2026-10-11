'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Scroll3DRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  rotateX?: number;
}

export default function Scroll3DReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.65,
  yOffset = 45,
  rotateX = 10,
}: Scroll3DRevealProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: yOffset,
        rotateX: rotateX,
        scale: 0.97,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
      }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowDown } from 'lucide-react';

export default function LusionWarpTunnelSection() {
  const tunnelRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: tunnelRef,
    offset: ['start start', 'end end'],
  });

  // Scale and opacity transitions as user travels through the warp tunnel
  const scale1 = useTransform(scrollYProgress, [0, 0.35], [0.6, 2.2]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.2, 0.38], [0, 1, 0]);

  const scale2 = useTransform(scrollYProgress, [0.3, 0.65], [0.6, 2.2]);
  const opacity2 = useTransform(scrollYProgress, [0.3, 0.5, 0.68], [0, 1, 0]);

  const scale3 = useTransform(scrollYProgress, [0.6, 0.95], [0.6, 2.2]);
  const opacity3 = useTransform(scrollYProgress, [0.6, 0.8, 0.98], [0, 1, 0]);

  return (
    <section
      ref={tunnelRef}
      className="relative h-[300vh] bg-transparent text-white"
    >
      {/* Pinned 3D Warp Chamber */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between items-center px-6 sm:px-12 py-24 overflow-hidden pointer-events-none">
        
        {/* Top Tunnel Telemetry */}
        <div className="w-full max-w-7xl flex items-center justify-between border-b border-white/10 pb-4 text-xs font-mono text-white/50 z-20">
          <div className="flex items-center space-x-2">
            <span className="text-[#c1ff00] animate-pulse">●</span>
            <span>[ 04 // 3D WARP TUNNEL • VELOCITY ACTIVE ]</span>
          </div>

          <div className="hidden sm:flex items-center space-x-4">
            <span>TRAVELLING THROUGH VEDIC PARADIGMS</span>
            <span>+</span>
            <span>Z-INDEX ACCELERATION</span>
          </div>

          <div className="text-[#00f0ff]">
            SECTOR: WARP-CONDUIT
          </div>
        </div>

        {/* Center 3D Zooming Typography Layers */}
        <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
          
          {/* Warp Text 1 */}
          <motion.div
            style={{ scale: scale1, opacity: opacity1 }}
            className="absolute text-center max-w-4xl px-4 will-change-transform"
          >
            <span className="text-xs font-mono tracking-widest uppercase text-[#00f0ff] block mb-3">
              [ CHAPTER // TRANSCENDENCE ]
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
              BEYOND THE NOISE OF MODERN CAMPUS LIFE<span className="text-[#00f0ff]">.</span>
            </h2>
          </motion.div>

          {/* Warp Text 2 */}
          <motion.div
            style={{ scale: scale2, opacity: opacity2 }}
            className="absolute text-center max-w-4xl px-4 will-change-transform"
          >
            <span className="text-xs font-mono tracking-widest uppercase text-[#f43f5e] block mb-3">
              [ CHAPTER // THE CORE AWAKENING ]
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
              WHERE ANXIETY DISSOLVES INTO INNER STILLNESS<span className="text-[#f43f5e]">.</span>
            </h2>
          </motion.div>

          {/* Warp Text 3 */}
          <motion.div
            style={{ scale: scale3, opacity: opacity3 }}
            className="absolute text-center max-w-4xl px-4 will-change-transform"
          >
            <span className="text-xs font-mono tracking-widest uppercase text-[#c1ff00] block mb-3">
              [ CHAPTER // EMPOWERED TOMORROW ]
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
              COMBINING SCIENTIFIC GENIUS WITH MORAL COURAGE<span className="text-[#c1ff00]">.</span>
            </h2>
          </motion.div>

        </div>

        {/* Bottom Tunnel Telemetry Strip */}
        <div className="w-full max-w-7xl flex items-center justify-between border-t border-white/10 pt-4 text-xs font-mono text-white/40 z-20">
          <span>COORDINATE: -180.0m → -280.0m</span>
          <div className="flex items-center space-x-2 text-white/70">
            <span>CONTINUE DESCENT</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </div>
          <span className="text-[#c1ff00]">EMERGING INTO GURUKUL NEXUS</span>
        </div>

      </div>
    </section>
  );
}

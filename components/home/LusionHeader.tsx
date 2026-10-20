'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { ArrowUpRight, UserCheck } from 'lucide-react';

interface LusionHeaderProps {
  onOpenDonate?: () => void;
}

export default function LusionHeader({ onOpenDonate }: LusionHeaderProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const soundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Soundwave canvas animation
  useEffect(() => {
    const canvas = soundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 4;
      const spacing = 3;
      const barWidth = 2.5;

      for (let i = 0; i < barCount; i++) {
        const height = isPlayingSound
          ? Math.sin(step + i * 1.2) * 6 + 8
          : 3;
        const x = i * (barWidth + spacing) + 4;
        const y = (canvas.height - height) / 2;

        ctx.fillStyle = isPlayingSound ? '#c1ff00' : '#888899';
        ctx.fillRect(x, y, barWidth, height);
      }

      step += 0.15;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlayingSound]);

  // Ambient harmonic audio synthesizer toggle (432Hz meditative tone)
  const toggleSound = () => {
    if (!isPlayingSound) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        oscRef.current = osc;
        gainRef.current = gain;
        setIsPlayingSound(true);
      } catch {
        setIsPlayingSound(false);
      }
    } else {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.5);
        setTimeout(() => {
          oscRef.current?.stop();
          audioCtxRef.current?.close();
          setIsPlayingSound(false);
        }, 500);
      } else {
        setIsPlayingSound(false);
      }
    }
  };

  const navLinks = [
    { num: '01', title: 'Home', href: '/' },
    { num: '02', title: 'About VOICE', href: '/about' },
    { num: '03', title: 'Activities & Workshops', href: '/programmes' },
    { num: '04', title: '120+ Centres', href: '/centres' },
    { num: '05', title: 'Student Transformation Stories', href: '/stories' },
    { num: '06', title: 'Partnerships & Collaboration', href: '/collaborate' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 px-5 sm:px-8 lg:px-12 py-5 sm:py-6 flex items-center justify-between pointer-events-none transition-colors">
        {/* Brand Logo with crosshair corner */}
        <div className="pointer-events-auto flex items-center space-x-3">
          <Link href="/" className="group flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-black tracking-tighter text-white font-mono uppercase">
              VOICE<span className="text-[#c1ff00]">.</span>GURUKUL
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
              EST. 1996
            </span>
          </Link>
        </div>

        {/* Center telemetry marker */}
        <div className="hidden lg:flex items-center space-x-6 text-[11px] font-mono tracking-widest text-white/40">
          <span>LAT 18.5204° N</span>
          <span className="text-[#c1ff00]">•</span>
          <span>VEDIC OASIS FOR INSPIRATION &amp; EDUCATION</span>
        </div>

        {/* Right Action Cluster */}
        <div className="pointer-events-auto flex items-center space-x-3">
          {/* Sound Synthesizer Button */}
          <button
            onClick={toggleSound}
            title={isPlayingSound ? 'Mute Meditative Tone' : 'Play 432Hz Ambient Meditative Tone'}
            className="hidden sm:flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all text-white"
          >
            <canvas ref={soundCanvasRef} width={26} height={16} className="pointer-events-none" />
          </button>

          {/* User Dashboard / Sign-in Pill */}
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 h-11 px-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold tracking-wider backdrop-blur-md transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DASHBOARD</span>
            </Link>
          ) : (
            <Link
              href="/dashboard/login"
              className="hidden md:flex items-center space-x-2 h-11 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 text-xs font-mono font-bold tracking-wider backdrop-blur-md transition-all"
            >
              <span>SIGN IN</span>
            </Link>
          )}

          {/* Lusion Signature Magnetic Pill Button: "SPONSOR / TALK" */}
          <button
            onClick={onOpenDonate || (() => {
              const el = document.getElementById('donate');
              el?.scrollIntoView({ behavior: 'smooth' });
            })}
            className="group relative h-11 px-6 rounded-full bg-gradient-to-r from-[#1a2ffb] via-[#3245ff] to-[#8832f7] hover:from-[#c1ff00] hover:to-[#00f0ff] hover:text-black text-white text-xs font-mono font-black uppercase tracking-wider overflow-hidden shadow-lg shadow-blue-900/30 transition-all duration-300 flex items-center space-x-2"
          >
            {/* Sliding text */}
            <div className="relative h-4 overflow-hidden flex flex-col justify-center">
              <span className="transition-transform duration-300 group-hover:-translate-y-5">
                SPONSOR YOUTH
              </span>
              <span className="absolute top-5 transition-transform duration-300 group-hover:-translate-y-5 font-black text-black">
                DONATE 80G
              </span>
            </div>

            {/* Glowing dot & arrow */}
            <span className="w-2 h-2 rounded-full bg-white group-hover:bg-black transition-colors" />
            <ArrowUpRight className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          {/* Lusion Animated Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative h-11 px-5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-all flex items-center space-x-2.5"
            aria-label="Toggle Navigation Menu"
          >
            <span>{menuOpen ? 'CLOSE' : 'MENU'}</span>
            <div className="flex space-x-1 items-center">
              <span className={`w-1.5 h-1.5 rounded-full bg-white transition-transform ${menuOpen ? 'rotate-90 scale-125 bg-[#c1ff00]' : ''}`} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            </div>
          </button>
        </div>
      </header>

      {/* Fullscreen Lusion Overlay Navigation Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-40 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 lg:p-16 overflow-y-auto"
          >
            {/* Top drawer bar */}
            <div className="flex justify-between items-center text-xs font-mono text-white/50 border-b border-white/10 pb-6">
              <span>VOICE GURUKUL // NAVIGATION PORTAL</span>
              <span className="text-[#c1ff00]">7 DIRECT DESTINATIONS</span>
            </div>

            {/* Main giant links with staggered reveals */}
            <div className="py-10 max-w-4xl mx-auto w-full space-y-3 sm:space-y-4">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-baseline justify-between py-3 border-b border-white/10 hover:border-white/40 transition-colors"
                  >
                    <div className="flex items-baseline space-x-4 sm:space-x-8">
                      <span className="text-xs sm:text-sm font-mono text-white/40 group-hover:text-[#c1ff00] transition-colors">
                        {link.num}
                      </span>
                      <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-[#c1ff00] group-hover:to-[#00f0ff] transition-all tracking-tight">
                        {link.title}
                      </span>
                    </div>
                    <ArrowUpRight className="w-6 h-6 text-white/30 group-hover:text-[#c1ff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Bottom drawer footer telemetry */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-white/50">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-[#c1ff00] animate-ping" />
                <span>ISKCON YOUTH FORUM AFFILIATED • 80G TAX EXEMPT</span>
              </div>
              <div className="flex items-center space-x-6">
                <Link href="/donate/2026GUW00001" onClick={() => setMenuOpen(false)} className="text-white hover:text-[#c1ff00]">
                  DIRECT PLEDGE
                </Link>
                <span>{"//"}</span>
                <Link href="/centres" onClick={() => setMenuOpen(false)} className="text-white hover:text-[#c1ff00]">
                  120+ CENTRES
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowRight,
  GraduationCap,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { GURUKUL_8_LEVEL_CURRICULUM, CourseLevel } from './curriculumData';

interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLevel?: number;
}

export default function CurriculumModal({
  isOpen,
  onClose,
  initialLevel = 1,
}: CurriculumModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedLevel(initialLevel);
      setSearchQuery('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialLevel]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeLevelData =
    GURUKUL_8_LEVEL_CURRICULUM.find((l) => l.level === selectedLevel) ||
    GURUKUL_8_LEVEL_CURRICULUM[0];

  // Global search across all 8 levels if user types
  const searchResults = searchQuery.trim()
    ? GURUKUL_8_LEVEL_CURRICULUM.flatMap((lvl) =>
        lvl.topics
          .filter((t) => t.toLowerCase().includes(searchQuery.toLowerCase().trim()))
          .map((topic) => ({ level: lvl.level, levelTitle: lvl.title, topic }))
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-sky-300 text-[11px] font-bold uppercase tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>8-Level Systematic Curriculum • 80 Transformative Topics</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                  VOICE Gurukul Course Offerings
                </h3>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header: Search & Level Navigation */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200/80 space-y-4 shrink-0">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all 80 curriculum topics (e.g. Stress, Anger, Karma, Habits, Mind)..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* 8-Level Quick Switcher Tabs */}
              {!searchQuery && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {GURUKUL_8_LEVEL_CURRICULUM.map((lvl) => {
                    const isSelected = selectedLevel === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        onClick={() => setSelectedLevel(lvl.level)}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                            : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                          isSelected ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lvl.level}
                        </span>
                        <span className="whitespace-nowrap">Level {lvl.level}</span>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Modal Body: Active Level Details or Search Results */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              
              {searchQuery ? (
                /* Search Results View */
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Search Results ({searchResults.length} topics matched)
                  </p>

                  {searchResults.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <p className="font-bold text-base">No topics matched &quot;{searchQuery}&quot;</p>
                      <p className="text-xs">Try searching for keywords like &quot;stress&quot;, &quot;concentration&quot;, &quot;leadership&quot;, or &quot;habits&quot;.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {searchResults.map((res, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors flex items-start gap-3"
                        >
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase shrink-0 mt-0.5">
                            Level {res.level}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {res.topic}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              Series: {res.levelTitle}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Level View */
                <div className="space-y-6">
                  
                  {/* Active Level Header Banner */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                          Level {activeLevelData.level}
                        </span>
                        <span className="text-xs font-bold text-sky-300">
                          {activeLevelData.badge}
                        </span>
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                        “{activeLevelData.title}” Series
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
                        {activeLevelData.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedLevel((prev) => Math.max(1, prev - 1))}
                        disabled={selectedLevel === 1}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        aria-label="Previous level"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <span className="text-xs font-bold text-white px-2">
                        {selectedLevel} / 8
                      </span>
                      <button
                        onClick={() => setSelectedLevel((prev) => Math.min(8, prev + 1))}
                        disabled={selectedLevel === 8}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        aria-label="Next level"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* 10 Topics Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                        10 Structured Curriculum Modules:
                      </h5>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                        Interactive Lecture + Group Discussion
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {activeLevelData.topics.map((topic, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3 group"
                        >
                          <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {String(tIdx + 1).padStart(2, '0')}
                          </span>
                          <div className="space-y-0.5">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug group-hover:text-indigo-950 transition-colors">
                              {topic}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">
                              Practical character &amp; mind cultivation
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 text-center sm:text-left">
                Offered offline across 120+ university centres and online on weekends.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
                >
                  Close Syllabus
                </button>
                <Link
                  href="/auth/register"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-indigo-500/20 text-center flex items-center justify-center gap-1.5"
                >
                  <span>Register for Courses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

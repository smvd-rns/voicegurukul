'use client';

import { useState, useEffect, useRef } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import DriveImage from '@/components/activities/DriveImage';
import PhotoLightboxModal from '@/components/activities/PhotoLightboxModal';
import Scroll3DReveal from '@/components/stories/Scroll3DReveal';
import MobileAutoScrollCarousel from '@/components/stories/MobileAutoScrollCarousel';
import StoriesAlternatingSlider from '@/components/stories/StoriesAlternatingSlider';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import {
  LEADER_FEEDBACK_DATA,
  FORMAL_LETTERS_DATA,
  ALUMNI_NETWORK_DATA,
  INITIAL_STUDENT_STORIES,
  LeaderFeedback,
  FormalLetter,
  AlumniProfile,
  StudentStory,
} from '@/components/stories/storiesData';
import {
  Award,
  GraduationCap,
  Building2,
  Quote,
  Star,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Maximize2,
  FileText,
  Users,
  Search,
  Briefcase,
  MapPin,
  TrendingUp,
  Compass,
  Check,
  ShieldCheck,
  Rocket,
  Play,
} from 'lucide-react';
import Link from 'next/link';

export default function StoriesPage() {
  const [filter, setFilter] = useState<'all' | 'leaders' | 'letters' | 'students' | 'alumni'>('all');
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [alumniCategory, setAlumniCategory] = useState<
    'all' | 'premier-tech' | 'corporate-leaders' | 'research-public' | 'academia-health'
  >('all');
  const [alumniSearch, setAlumniSearch] = useState('');

  const [leaderSubfilter, setLeaderSubfilter] = useState<'all' | 'academic' | 'corporate'>('all');

  const filteredLeaders = LEADER_FEEDBACK_DATA.filter(
    (l) => leaderSubfilter === 'all' || l.type === leaderSubfilter
  );

  const academicCount = LEADER_FEEDBACK_DATA.filter((l) => l.type === 'academic').length;
  const corporateCount = LEADER_FEEDBACK_DATA.filter((l) => l.type === 'corporate').length;

  // Handle direct anchor links like #formal-letters
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'formal-letters') {
        setFilter((prev) => (prev === 'all' || prev === 'letters' ? prev : 'all'));
      }
      const el = document.getElementById(hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, []);

  const [selectedPhoto, setSelectedPhoto] = useState<{
    driveId: string;
    title: string;
    caption: string;
  } | null>(null);

  const filteredAlumni = ALUMNI_NETWORK_DATA.filter((a) => {
    const matchesCat = alumniCategory === 'all' || a.category === alumniCategory;
    const q = alumniSearch.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.education && a.education.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q) ||
      a.companyOrOrg.toLowerCase().includes(q) ||
      (a.badge && a.badge.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const totalCount =
    LEADER_FEEDBACK_DATA.length +
    FORMAL_LETTERS_DATA.length +
    ALUMNI_NETWORK_DATA.length +
    INITIAL_STUDENT_STORIES.length;



  const renderLetterCard = (letter: FormalLetter, isMobile = false) => (
    <div className={`bg-white/95 backdrop-blur-xl rounded-3xl ${isMobile ? 'p-5' : 'p-6 sm:p-8'} border border-slate-200/90 hover:border-emerald-400 shadow-[0_15px_35px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full space-y-5 sm:space-y-6 relative overflow-hidden group`}>
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <span className="inline-flex px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] sm:text-[11px] font-bold text-emerald-700 w-fit">
            {letter.tag}
          </span>
          {letter.refDate && (
            <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400">
              {letter.refDate}
            </span>
          )}
        </div>

        <div className="space-y-0.5 sm:space-y-1">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
            SUBJECT OF ENDORSEMENT
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
            {letter.subject}
          </h4>
        </div>

        <div className="grid sm:grid-cols-12 gap-4 sm:gap-5 items-center">
          <div
            onClick={() =>
              setSelectedPhoto({
                driveId: letter.driveId,
                title: letter.title,
                caption: `${letter.signatory} • ${letter.designation}, ${letter.institution}`,
              })
            }
            className="sm:col-span-5 relative aspect-[3/4] max-w-[200px] sm:max-w-none mx-auto sm:mx-0 w-full rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-xl bg-slate-100 cursor-pointer group/letter transform-gpu transition-all duration-500 hover:scale-[1.03]"
            title="Click to view full letterhead in high resolution"
          >
            <DriveImage
              driveId={letter.driveId}
              alt={letter.title}
              size={800}
              className="w-full h-full object-cover"
              showZoomIcon={false}
            />
            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/letter:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white p-3 text-center">
              <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <span className="text-xs font-bold tracking-wide">
                Enlarge Letter
              </span>
            </div>
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-400/50 text-[9px] font-mono font-bold text-emerald-300">
              Verified Letterhead
            </div>
          </div>

          <div className="sm:col-span-7 space-y-3">
            <div>
              <h3 className="text-sm sm:text-lg font-black text-slate-900 font-display leading-snug">
                {letter.institution}
              </h3>
              <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                {letter.signatory} ({letter.designation})
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed italic shadow-inner">
              &ldquo;{letter.summary}&rdquo;
            </div>

            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block">
                ENDORSED HIGHLIGHTS
              </span>
              {letter.keyHighlights.map((hl, hlIdx) => (
                <div key={hlIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{hl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() =>
            setSelectedPhoto({
              driveId: letter.driveId,
              title: letter.title,
              caption: `${letter.signatory} • ${letter.designation}, ${letter.institution}`,
            })
          }
          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>View High-Res Letter</span>
        </button>

        <a
          href={letter.driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold transition-colors text-[11px]"
        >
          <span>Official Drive File</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    </div>
  );



  const renderAlumnusCard = (alumnus: AlumniProfile, isMobile = false) => (
    <div className={`group bg-white/90 backdrop-blur-md rounded-2xl ${isMobile ? 'p-4' : 'p-5'} border border-slate-200/80 hover:border-amber-400 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full space-y-3.5 relative overflow-hidden`}>
      <span className="absolute top-2 left-2 text-slate-200 font-mono text-[9px] select-none">+</span>
      <span className="absolute top-2 right-2 text-slate-200 font-mono text-[9px] select-none">+</span>

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-900 text-sm font-display group-hover:text-amber-700 transition-colors">
              {alumnus.name}
            </h3>
            {alumnus.education && (
              <p className="text-[11px] font-medium text-slate-500 leading-tight">
                {alumnus.education}
              </p>
            )}
          </div>

          {alumnus.badge && (
            <span className="px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-200 text-[10px] font-bold text-amber-900 shrink-0 whitespace-nowrap">
              {alumnus.badge}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{alumnus.role}</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium pl-5 truncate">
            {alumnus.companyOrOrg}
          </p>
        </div>
      </div>

      {alumnus.location && (
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-50">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{alumnus.location}</span>
        </div>
      )}
    </div>
  );

  const [activeNavSection, setActiveNavSection] = useState<'all' | 'leaders' | 'letters' | 'students' | 'alumni'>('all');
  const currentNavRef = useRef<'all' | 'leaders' | 'letters' | 'students' | 'alumni'>('all');
  const navContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  const scrollNavTabIntoView = (navKey: string) => {
    const tabEl = document.getElementById(`nav-tab-${navKey}`);
    const container = navContainerRef.current;
    if (tabEl && container) {
      const tabLeft = tabEl.offsetLeft;
      const tabWidth = tabEl.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = tabLeft - (containerWidth / 2) + (tabWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const sections = [
      { id: 'alumni-network', key: 'alumni' as const },
      { id: 'student-stories', key: 'students' as const },
      { id: 'formal-letters', key: 'letters' as const },
      { id: 'leaders-appreciation', key: 'leaders' as const },
    ];

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      if (window.scrollY < 380) {
        if (currentNavRef.current !== 'all') {
          currentNavRef.current = 'all';
          setActiveNavSection('all');
          scrollNavTabIntoView('all');
        }
        return;
      }

      const scrollPosition = window.scrollY + 280;

      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            if (currentNavRef.current !== sec.key) {
              currentNavRef.current = sec.key;
              setActiveNavSection(sec.key);
              scrollNavTabIntoView(sec.key);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const jumpToSection = (sectionId: string, navKey: 'all' | 'leaders' | 'letters' | 'students' | 'alumni') => {
    isProgrammaticScrollRef.current = true;
    currentNavRef.current = navKey;
    setActiveNavSection(navKey);
    setFilter('all');
    scrollNavTabIntoView(navKey);

    if (navKey === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 700);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-500 selection:text-white overflow-x-clip">
      {/* Ambient Chromatic Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-indigo-500/10 via-sky-400/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-[35%] -right-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[65%] -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-20 right-1/4 w-[700px] h-[500px] bg-amber-500/10 rounded-full blur-3xl opacity-50" />
        {/* Subtle Tech Dot-Matrix Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366f112_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      </div>

      <PublicNavbar />

      <main className="relative z-10 flex-1">
        {/* =========================================================
            HERO SECTION: Atmospheric Header & Scroll-Revealed Stats
        ========================================================= */}
        <section id="hero-section" className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 xl:pt-24 xl:pb-28 overflow-hidden border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-10 text-center">
            {/* Top Eyebrow */}
            <Scroll3DReveal yOffset={20} rotateX={4}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-indigo-200/80 shadow-sm text-xs font-bold text-indigo-700 tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>PROVEN SOCIAL PROOF &amp; MULTI-DECADE IMPACT</span>
              </div>
            </Scroll3DReveal>

            {/* Main Title & Subtitle */}
            <Scroll3DReveal delay={0.1} yOffset={30} rotateX={6}>
              <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-4xl lg:text-4xl xl:text-6xl font-black text-slate-900 tracking-tight font-display leading-[1.12]">
                  Transformations That Speak <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 bg-clip-text text-transparent">
                    For Themselves
                  </span>
                </h1>
                <p className="text-xs sm:text-base lg:text-base xl:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
                  Academic directors, university deans, corporate leaders, and students share how timeless Vedic principles empowered their focus, character, and life milestones.
                </p>
              </div>
            </Scroll3DReveal>

            {/* 3D Floating Interactive Metrics Ribbon with Staggered Scroll Reveal */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 xl:gap-6 max-w-5xl mx-auto pt-2 sm:pt-4 perspective-[1200px]">
              {[
                {
                  value: 25,
                  suffix: '+ Years',
                  label: 'Legacy of Vedic Character',
                  sub: 'Since 1996 across India',
                  accent: 'from-indigo-500 to-blue-600',
                  glow: 'rgba(99,102,241,0.15)',
                },
                {
                  value: 100,
                  suffix: '+ Centres',
                  label: 'Campus Network',
                  sub: 'IITs, NITs & Premier Unis',
                  accent: 'from-sky-500 to-teal-600',
                  glow: 'rgba(14,165,233,0.15)',
                },
                {
                  value: 5000,
                  suffix: '+',
                  label: 'Workshops Delivered',
                  sub: 'Mind, Stress & Leadership',
                  accent: 'from-purple-500 to-pink-600',
                  glow: 'rgba(168,85,247,0.15)',
                },
                {
                  value: 40,
                  suffix: '+ Elite Alumni',
                  label: 'Distinguished Network',
                  sub: 'ISRO, IITs, IIMs & Global MNCs',
                  accent: 'from-amber-500 to-orange-600',
                  glow: 'rgba(245,158,11,0.15)',
                },
              ].map((stat, sIdx) => (
                <Scroll3DReveal key={sIdx} delay={0.15 + sIdx * 0.08} yOffset={35} rotateX={8}>
                  <div className="bg-white/85 backdrop-blur-xl border border-white/90 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-left h-full flex flex-col justify-between group relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity opacity-40 group-hover:opacity-100"
                      style={{ background: stat.glow }}
                    />
                    <div className="space-y-1">
                      <div className={`text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r ${stat.accent} bg-clip-text text-transparent font-display`}>
                        <AnimatedCounter to={stat.value} suffix={stat.suffix} duration={2.2} />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                        {stat.label}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100/80">
                      {stat.sub}
                    </p>
                  </div>
                </Scroll3DReveal>
              ))}
            </div>

            {/* Featured Testimonial Video Showcase */}
            <Scroll3DReveal delay={0.35} yOffset={25} rotateX={6}>
              <div className="pt-6 max-w-4xl mx-auto">
                <div className="relative rounded-3xl p-3 sm:p-4 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)]">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner group">
                    {isPlayingVideo ? (
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube-nocookie.com/embed/p8x4T_WGC4I?autoplay=1&rel=0&modestbranding=1"
                        title="VOICE Gurukul Transformation Stories"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <div
                        onClick={() => setIsPlayingVideo(true)}
                        className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center group"
                      >
                        {/* High-res YouTube thumbnail with zero title or avatar overlays */}
                        <img
                          src="https://i.ytimg.com/vi/p8x4T_WGC4I/sddefault.jpg"
                          alt="VOICE Gurukul Transformation Stories"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Soft cinematic vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/30 group-hover:from-black/50 group-hover:via-black/10 transition-colors" />

                        {/* Central Play Button */}
                        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-950/60 group-hover:scale-110 group-hover:bg-red-500 transition-all duration-300">
                          <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-white ml-1" />
                        </div>

                        {/* Bottom subtle indicator */}
                        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between text-xs text-white/95 bg-black/50 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 pointer-events-none">
                          <span className="font-semibold truncate">Watch Testimonials &amp; Camp Glimpses</span>
                          <span className="text-[11px] text-white/75 hidden sm:inline">Click to play video</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
                    <div className="flex items-center space-x-2 font-medium text-slate-700">
                      <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                      <span>Hear Directly From Our Students &amp; Alumni</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                      <span>VOICE Stories</span>
                      <span>•</span>
                      <span>Real Impact &amp; Life Changing Experiences</span>
                    </div>
                  </div>
                </div>
              </div>
            </Scroll3DReveal>
          </div>
        </section>

        {/* =========================================================
            STICKY FILTER & JUMP NAVIGATION BAR (MOBILE & DESKTOP)
            Remains intact at the top while scrolling for instant jumps
        ========================================================= */}
        <div className="sticky top-20 z-40 bg-[#f8fafc]/95 backdrop-blur-xl border-y border-slate-200/80 shadow-xs py-2 sm:py-3 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center">
            <div
              ref={navContainerRef}
              className="flex overflow-x-auto no-scrollbar scrollbar-none items-center gap-1.5 sm:gap-2 max-w-full py-0.5 px-0.5 scroll-smooth"
            >
              <button
                id="nav-tab-all"
                type="button"
                onClick={() => jumpToSection('hero-section', 'all')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0 whitespace-nowrap cursor-pointer ${
                  activeNavSection === 'all'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
                }`}
              >
                All Endorsements ({totalCount})
              </button>
              <button
                id="nav-tab-leaders"
                type="button"
                onClick={() => jumpToSection('stories-showcase', 'leaders')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeNavSection === 'leaders' || activeNavSection === 'students'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Faculty &amp; Student Stories (14)</span>
              </button>
              <button
                id="nav-tab-letters"
                type="button"
                onClick={() => jumpToSection('formal-letters', 'letters')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeNavSection === 'letters'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Official Letterheads ({FORMAL_LETTERS_DATA.length})</span>
              </button>
              <button
                id="nav-tab-alumni"
                type="button"
                onClick={() => jumpToSection('alumni-network', 'alumni')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeNavSection === 'alumni'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Distinguished Alumni ({ALUMNI_NETWORK_DATA.length}+)</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 1: FEATURED VOICES OF IMPACT (ALTERNATING SLIDER)
            Alternating faculty and student cards, 40-to-60 word excerpts,
            prominent face photos with uniform crops alongside name, role & outcome,
            manual arrow slider with NO auto-advance, and "Read full story" modal.
        ========================================================= */}
        {(filter === 'all' || filter === 'leaders' || filter === 'students') && (
          <section id="stories-showcase" className="scroll-mt-36 sm:scroll-mt-40 py-12 sm:py-20 relative overflow-hidden border-b border-slate-200/60">
            {/* Anchors for direct jump links */}
            <div id="leaders-appreciation" className="absolute -top-36" />
            <div id="student-stories" className="absolute -top-36" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
              {/* Header */}
              <Scroll3DReveal yOffset={30} rotateX={6}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
                  <div className="space-y-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/80 text-xs font-bold uppercase tracking-wider text-indigo-900 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Alternating Perspectives • Multi-Decade Impact
                    </span>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
                      Voices of Impact: Faculty &amp; Students
                    </h2>
                    <p className="text-xs sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                      University directors and professors endorsing campus transformations, paired alongside authentic student journeys of focus, character, and life milestones.
                    </p>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 text-xs font-bold shadow-xs shrink-0 flex items-center gap-2 self-start md:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Interactive Slider with Manual Arrow Navigation</span>
                  </div>
                </div>
              </Scroll3DReveal>

              {/* Alternating Slider Showcase */}
              <StoriesAlternatingSlider />
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 2: FORMAL INSTITUTIONAL ENDORSEMENT LETTERS
        ========================================================= */}
        {(filter === 'all' || filter === 'letters') && (
          <section id="formal-letters" className="scroll-mt-36 sm:scroll-mt-40 py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-white border-b border-slate-200/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              {/* Header */}
              <Scroll3DReveal yOffset={30} rotateX={6}>
                <div className="space-y-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold uppercase tracking-wider text-emerald-700 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Official Institutional Letterheads
                  </span>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
                    Formal Recommendation Letters
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                    Certified endorsements issued on official college letterheads by Directors and Heads of Departments recognizing VOICE Gurukul&apos;s campus transformation programs.
                  </p>
                </div>
              </Scroll3DReveal>

              {/* Desktop Cards Grid with 3D Scroll Reveal */}
              <div className="hidden lg:grid grid-cols-2 gap-8 perspective-[1200px]">
                {FORMAL_LETTERS_DATA.map((letter, ltIdx) => (
                  <Scroll3DReveal key={letter.id} delay={ltIdx * 0.15} yOffset={45} rotateX={8}>
                    {renderLetterCard(letter, false)}
                  </Scroll3DReveal>
                ))}
              </div>

              {/* Mobile Auto-Scrolling Carousel */}
              <div className="block lg:hidden">
                <MobileAutoScrollCarousel activeColorClass="bg-emerald-600" autoScrollInterval={6000}>
                  {FORMAL_LETTERS_DATA.map((letter) => (
                    <div key={letter.id} className="h-full">
                      {renderLetterCard(letter, true)}
                    </div>
                  ))}
                </MobileAutoScrollCarousel>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 4: DISTINGUISHED ALUMNI NETWORK
        ========================================================= */}
        {(filter === 'all' || filter === 'alumni') && (
          <section id="alumni-network" className="scroll-mt-36 sm:scroll-mt-40 py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/60 border-b border-slate-200/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              {/* Header & Search */}
              <Scroll3DReveal yOffset={30} rotateX={6}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-bold uppercase tracking-wider text-amber-800 shadow-sm">
                      <Rocket className="w-3.5 h-3.5" />
                      Global Alumni Footprint
                    </span>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
                      Distinguished Alumni Network
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                      Over two decades of shaping scientists, corporate leaders, professors, and public servants who carry values and character across premier institutions worldwide.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      placeholder="Search alumni, institute, role..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none transition-all shadow-sm"
                    />
                    {alumniSearch && (
                      <button
                        onClick={() => setAlumniSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </Scroll3DReveal>

              {/* Subcategory Filter Tabs: Smooth scroll on mobile */}
              <div className="flex overflow-x-auto no-scrollbar scrollbar-none items-center gap-1.5 sm:gap-2 pb-1 max-w-full">
                {[
                  { id: 'all', label: `All Alumni (${ALUMNI_NETWORK_DATA.length})` },
                  { id: 'premier-tech', label: 'IITs, NITs & IIMs' },
                  { id: 'corporate-leaders', label: 'Corporate & Tech MNCs' },
                  { id: 'research-public', label: 'ISRO, PSUs & Railways' },
                  { id: 'academia-health', label: 'Academia & Healthcare' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setAlumniCategory(cat.id as typeof alumniCategory)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap ${
                      alumniCategory === cat.id
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Desktop Cards Grid with 3D Scroll Reveal */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 perspective-[1200px]">
                {filteredAlumni.map((alumnus, aIdx) => (
                  <Scroll3DReveal key={alumnus.id} delay={(aIdx % 4) * 0.05} yOffset={30} rotateX={6}>
                    {renderAlumnusCard(alumnus, false)}
                  </Scroll3DReveal>
                ))}
              </div>

              {/* Mobile Auto-Scrolling Carousel */}
              <div className="block sm:hidden">
                <MobileAutoScrollCarousel
                  activeColorClass="bg-amber-600"
                  cardWidthClass="w-[78vw] max-w-[300px]"
                  autoScrollInterval={4500}
                >
                  {filteredAlumni.map((alumnus) => (
                    <div key={alumnus.id} className="h-full">
                      {renderAlumnusCard(alumnus, true)}
                    </div>
                  ))}
                </MobileAutoScrollCarousel>
              </div>

              {filteredAlumni.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500">No alumni matching &quot;{alumniSearch}&quot;</p>
                  <button
                    onClick={() => {
                      setAlumniSearch('');
                      setAlumniCategory('all');
                    }}
                    className="mt-2 text-xs text-amber-600 font-bold hover:underline"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              )}

              {/* Bottom Network Ribbon with Scroll Reveal */}
              <Scroll3DReveal yOffset={30} rotateX={4}>
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-md">
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      ...and hundreds more esteemed alumni leading with character &amp; competence
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xl">
                      Our alumni are driving innovation, science, academia, and social reform across top global firms and public institutions.
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-amber-600 text-white font-bold text-xs shrink-0 shadow-sm">
                    120+ Centres Network
                  </span>
                </div>
              </Scroll3DReveal>
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 5: CAMPUS PARTNERSHIP COLLABORATION (SCROLL REVEAL)
        ========================================================= */}
        <section className="py-16 sm:py-20 relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 perspective-[1200px]">
            <Scroll3DReveal yOffset={35} rotateX={6}>
              <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden border border-white/10 hover:shadow-[0_25px_60px_rgba(30,27,75,0.4)] transition-all duration-500">
                {/* 3D Atmospheric Light Cones */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-3 text-center lg:text-left relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sky-300 text-xs font-bold uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>College Partnership Program</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black font-display text-white tracking-tight">
                    Are you a university dean, director, or faculty head?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Bring VOICE Gurukul&apos;s proven value education seminars, habit mastery workshops, and youth mentoring to your university campus.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3.5 relative z-10 shrink-0">
                  <Link
                    href="/collaborate#colleges"
                    className="px-7 py-4 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity shadow-xl flex items-center gap-2 group"
                  >
                    <span>Request Campus Collaboration</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/programmes"
                    className="px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-white/20"
                  >
                    Explore Programmes
                  </Link>
                </div>
              </div>
            </Scroll3DReveal>
          </div>
        </section>
      </main>

      <PublicFooter />

      {/* Lightbox Modal for Formal Letters High-Res Preview */}
      {selectedPhoto && (
        <PhotoLightboxModal
          photo={{
            driveId: selectedPhoto.driveId,
            title: selectedPhoto.title,
            caption: selectedPhoto.caption,
          }}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

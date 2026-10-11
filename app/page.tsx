'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import Voicegurukul3DWorld from '@/components/home/Voicegurukul3DWorld';
import VoicegurukulHorizontalPillars from '@/components/home/VoicegurukulHorizontalPillars';
import VoicegurukulCourseCards from '@/components/home/VoicegurukulCourseCards';
import CurvedSectionConnector from '@/components/home/CurvedSectionConnector';
import DriveImage from '@/components/activities/DriveImage';
import { 
  Heart, 
  BookOpen, 
  Users, 
  MapPin, 
  CheckCircle2, 
  ChevronRight, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Star, 
  Award, 
  Compass, 
  Check, 
  Gift, 
  Zap,
  Globe2,
  Lock,
  ArrowUpRight,
  HeartHandshake
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  
  // Interactive Donation State
  const [selectedDonationTier, setSelectedDonationTier] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showDonationModal, setShowDonationModal] = useState<boolean>(false);

  // Gallery Filter State
  const [activeGalleryTab, setActiveGalleryTab] = useState<string>('all');

  // Hero Mosaic 3D Spatial Tilt State
  const [mosaicRotX, setMosaicRotX] = useState(0);
  const [mosaicRotY, setMosaicRotY] = useState(0);

  const handleMosaicMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setMosaicRotX(-((y - centerY) / centerY) * 12);
    setMosaicRotY(((x - centerX) / centerX) * 12);
  };

  const handleMosaicMouseLeave = () => {
    setMosaicRotX(0);
    setMosaicRotY(0);
  };

  // Animated Counter Component
  const Counter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const end = target;
      const duration = 1800;
      const increment = Math.ceil(end / (duration / 20));

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(start);
        }
      }, 20);

      return () => clearInterval(timer);
    }, [target]);

    return <span>{count.toLocaleString()}{suffix}</span>;
  };

  // Donation Sponsorship Packages
  const donationTiers = [
    {
      amount: 1500,
      title: 'Sponsor Value Education Kit',
      impact: 'Provides 1 student with Bhagavad Gita study guides, course workbooks & 1 month of personal mentorship.',
      popular: false,
      badge: 'Starter Gift'
    },
    {
      amount: 5000,
      title: 'Sponsor Scholar Ashram & Meals',
      impact: 'Sponsors nutritious Sattvic meals, library study desk & clean ashram facilities for 1 college student for 1 month.',
      popular: true,
      badge: 'Most Impactful'
    },
    {
      amount: 15000,
      title: 'Campus Youth Mental Health Camp',
      impact: 'Funds an auditorium de-addiction & stress management workshop reaching 100+ university students.',
      popular: false,
      badge: 'Campus Catalyst'
    },
    {
      amount: 50000,
      title: 'Youth Gurukul Ashram Patron',
      impact: 'Supports ashram library upgrades, digital course infrastructure & subsidized stay for 10 scholars.',
      popular: false,
      badge: 'Gurukul Patron'
    }
  ];

  // Photo Gallery Items (Loaded directly via Google Drive CDN)
  const galleryItems = [
    {
      category: 'workshops',
      title: 'Interactive Campus Seminars',
      subtitle: 'Over 5,000+ interactive auditorium sessions conducted across IITs & NITs',
      driveId: '1inm5_00nraNdt0oIAgdIC3NUNRIF9uI-',
      tag: 'Campus Seminars'
    },
    {
      category: 'lifestyle',
      title: 'VOICE Lifestyle Study Circles',
      subtitle: 'Collaborative, serene study atmosphere free from digital burnout and toxic habits',
      driveId: '1jtl9cOQkarP8NLB0zcb-1VUTK3UsKq-z',
      tag: 'VOICE Lifestyle'
    },
    {
      category: 'meditation',
      title: 'Early Morning Mantra Meditation',
      subtitle: 'Awakening sharp memory, inner stillness and joyful enthusiasm',
      driveId: '18RD1wbg9C8l_8WATZymmBjLiU0J9K0sB',
      tag: 'Mind Focus'
    },
    {
      category: 'meals',
      title: 'Wholesome Sattvic Prasadam',
      subtitle: 'Nutritious, pure vegetarian food cooked with love and spiritual sanctity',
      driveId: '1RFdyn3hBZEykLC4ngNUlpOvCtS0ArPWY',
      tag: 'Healthy Nutrition'
    },
    {
      category: 'retreats',
      title: 'Youth Nature Treks & Retreats',
      subtitle: 'Experiencing bonding, nature harmony and devotional adventures',
      driveId: '1iSVFm2b-gzBtCn1_WzedJhbhmcZ4k493',
      tag: 'Outdoors'
    },
    {
      category: 'mentorship',
      title: 'One-on-One Career & Life Mentoring',
      subtitle: 'Senior corporate leaders & scientists guiding youth with empathy',
      driveId: '1Fp_eum7Nh0VyfeVQIH99QKZJEjRS_tug',
      tag: 'Life Mentorship'
    }
  ];

  const filteredGallery = activeGalleryTab === 'all' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeGalleryTab);

  // Authentic Alumni Impact Stories from Testimonials (/stories)
  const alumniList = [
    {
      name: 'Dr. Rahul Kumar Sevakula',
      college: 'NIT Warangal • IIT Kanpur PhD',
      exam: 'Harvard Medical School • IIT-K PhD',
      role: 'Jr. Faculty at Harvard Medical School & MGH',
      quote: 'We learnt in VOICE that "We should try our best and leave the rest to God". This teaching gave great relief and reduced exam stress, helping me secure 5th rank at NITW, complete my PhD at IIT Kanpur, and conduct research at Harvard.',
      driveId: '1uOTcnAf0uxs3tkcLrVYeIRd-NrPkOi36'
    },
    {
      name: 'Amarendra Edpuganti',
      college: 'NIT Warangal • IIT Kanpur M.Tech',
      exam: 'GATE All India Rank 26 (EE)',
      role: 'PhD Scholar Singapore • Ex-Adobe Systems',
      quote: 'VOICE seminars and regular mantra meditation cleared my mental anxiety and restored my focus. When preparing for GATE with just 2.5 months, I felt zero stress and achieved AIR 26 in GATE 2010.',
      driveId: '1LnNGU3F7d17EKTglx7xDHA5jj06Ps4pd'
    },
    {
      name: 'Sairaj Deshmukh',
      college: 'NMIET, Pune Alumnus',
      exam: 'Leadership & Character Training',
      role: 'Senior QA Engineer at Advik Hi-Tech',
      quote: 'Along with shaping my studies and career, VOICE played a crucial part in shaping my life and building character. Group discussions and stage programs boosted confidence, while a caring circle of friends inspired living with values.',
      driveId: '12FOi1FSPyAcmY7yICA9G_Siruvlt1FI8'
    }
  ];

  const currentDonationAmount = customAmount ? parseInt(customAmount) || 0 : selectedDonationTier;

  return (
    <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-clip relative">
      
      {/* Real-time 3D Sacred Geometry World (Golden Lotus & Stardust with Camera Fly-through) */}
      <Voicegurukul3DWorld />

      {/* Top Authentic Voicegurukul Navbar */}
      <PublicNavbar />

      {/* =========================================================================
          HERO SECTION: Authentic Voicegurukul Copy + Real 3D Three.js Background
          ========================================================================= */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 bg-gradient-to-b from-amber-50/40 via-sky-50/30 to-[#fafcff]">
        
        {/* Soft Ambient Vector Glow Orbs */}
        <div className="absolute top-0 right-10 w-[600px] h-[600px] bg-gradient-to-br from-amber-300/25 via-orange-200/20 to-purple-200/15 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute top-1/3 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-sky-200/30 via-indigo-100/25 to-emerald-100/20 rounded-full blur-3xl pointer-events-none -z-0"></div>

        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Column: Authentic Voicegurukul Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              
              {/* Devotional Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/95 border border-amber-200/90 shadow-sm text-amber-900 text-xs sm:text-sm font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>Rekindling Wisdom • Reviving Love • Est. 1996</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                Empowering Youth.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700">
                  Rekindling Wisdom.
                </span><br />
                Transforming Tomorrow.
              </h1>

              {/* Tagline */}
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                VOICE Gurukul bridges academic brilliance with the drug-free VOICE lifestyle, mental resilience, and timeless values across <strong className="text-slate-900 font-semibold">100+ university centres</strong>.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                
                {/* DONATION CTA */}
                <a
                  href="#donate"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 group"
                >
                  <Heart className="w-5 h-5 fill-white/80 group-hover:scale-110 transition-transform" />
                  <span>Sponsor a Student</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </a>

                {/* EXPLORE PROGRAMMES CTA */}
                <a
                  href="#programmes"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-700 font-bold text-sm sm:text-base border border-slate-200/90 shadow-sm transition-all flex items-center justify-center space-x-2 hover:border-indigo-300"
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Explore Programmes</span>
                </a>

                {/* FIND CENTRES CTA */}
                <Link
                  href="/centres"
                  className="w-full sm:w-auto px-6 py-4 rounded-full text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center space-x-1.5 hover:underline"
                >
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Find 100+ Centres</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>100% Substance-Free Living</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>80G Tax-Exempt Donations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mentors from IIT, NIT &amp; Harvard</span>
                </div>
              </div>

            </motion.div>

            {/* Right Column: Visual Photo Mosaic */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Ambient colorful glow behind collage */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-amber-400/30 via-orange-400/20 to-indigo-500/30 rounded-3xl blur-2xl opacity-70"></div>

                {/* Dynamic 2x2 Photo Mosaic Grid with 3D Spatial Tilt */}
                <motion.div 
                  onMouseMove={handleMosaicMouseMove}
                  onMouseLeave={handleMosaicMouseLeave}
                  animate={{
                    rotateX: mosaicRotX,
                    rotateY: mosaicRotY,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative grid grid-cols-2 gap-3.5 p-3.5 bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-2xl [perspective:1000px] hover:shadow-[0_25px_50px_rgba(245,158,11,0.2)] transition-shadow duration-300"
                >
                  
                  {/* Photo 1: Seminar / Workshop (translateZ: 30px) */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{ transform: 'translateZ(30px)' }}
                    className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md group bg-slate-100"
                  >
                    <DriveImage
                      driveId="1lnPr9Z48ajIUK70bXHZcBhOlp7DOyDlK"
                      alt="Campus Seminars"
                      size={500}
                      priority={true}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                      showZoomIcon={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3 pointer-events-none z-10">
                      <span className="text-[11px] font-bold text-white drop-shadow">Campus Seminars</span>
                    </div>
                  </motion.div>

                  {/* Photo 2: VOICE Lifestyle (translateZ: 50px) */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{ transform: 'translateZ(50px)' }}
                    className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md group bg-slate-100"
                  >
                    <DriveImage
                      driveId="1jtl9cOQkarP8NLB0zcb-1VUTK3UsKq-z"
                      alt="VOICE Lifestyle"
                      size={500}
                      priority={true}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                      showZoomIcon={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3 pointer-events-none z-10">
                      <span className="text-[11px] font-bold text-amber-200 drop-shadow">VOICE Lifestyle</span>
                    </div>
                  </motion.div>

                  {/* Photo 3: Meditation & Focus (translateZ: 40px) */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{ transform: 'translateZ(40px)' }}
                    className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md group bg-slate-100"
                  >
                    <DriveImage
                      driveId="1XFEvqnESYO3x_86TJkDv6Hco-Kc08dRX"
                      alt="Mantra Meditation"
                      size={500}
                      priority={true}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                      showZoomIcon={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3 pointer-events-none z-10">
                      <span className="text-[11px] font-bold text-sky-200 drop-shadow">Mantra Meditation</span>
                    </div>
                  </motion.div>

                  {/* Photo 4: Healthy Meals & Culture (translateZ: 60px) */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{ transform: 'translateZ(60px)' }}
                    className="relative h-44 sm:h-52 rounded-2xl overflow-hidden shadow-md group bg-slate-100"
                  >
                    <DriveImage
                      driveId="1jBJYtq06L2CkRIJl7863yxLmKMWL5E4U"
                      alt="Prasadam"
                      size={500}
                      priority={true}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                      showZoomIcon={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3 pointer-events-none z-10">
                      <span className="text-[11px] font-bold text-emerald-200 drop-shadow">Prasadam</span>
                    </div>
                  </motion.div>

                  {/* Floating Micro Badge 1 (translateZ: 75px) */}
                  <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    style={{ transform: 'translateZ(75px)' }}
                    className="absolute -top-4 -left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-amber-100 flex items-center space-x-2 z-20"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-bold text-slate-800">26,500+ Youths Mentored</span>
                  </motion.div>

                  {/* Floating Micro Badge 2 (translateZ: 80px) */}
                  <motion.div 
                    animate={{ y: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                    style={{ transform: 'translateZ(80px)' }}
                    className="absolute -bottom-4 -right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center space-x-2 z-20"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span className="text-xs font-bold">100+ Youth Ashrams</span>
                  </motion.div>

                </motion.div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          LIVE ANIMATED IMPACT RIBBON (Credibility & Donor Social Proof)
          ========================================================================= */}
      <section className="py-8 bg-white border-y border-slate-100 relative z-10">
        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200/60 shadow-sm text-center"
            >
              <p className="text-3xl sm:text-4xl font-black text-amber-600 font-mono">
                <Counter target={26594} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">Scholars Mentored</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-sky-50/80 to-indigo-50/40 border border-sky-200/60 shadow-sm text-center"
            >
              <p className="text-3xl sm:text-4xl font-black text-sky-600 font-mono">
                <Counter target={100} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">Youth Ashrams</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/80 to-pink-50/40 border border-purple-200/60 shadow-sm text-center"
            >
              <p className="text-3xl sm:text-4xl font-black text-purple-600 font-mono">
                <Counter target={5000} suffix="+" />
              </p>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">Campus Seminars</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/60 shadow-sm text-center"
            >
              <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">
                <Counter target={30} suffix="+ Yrs" />
              </p>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">Proven Heritage</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          THE CORE 4 PILLARS: 3D HORIZONTAL SCROLL JOURNEY (Lusion-style fly-through)
          (Scroll vertically to travel horizontally through the 4 Pillars!)
          ========================================================================= */}
      <VoicegurukulHorizontalPillars />

      {/* 3D Flowing Curved Connecting Path between Pillars and Courses */}
      <CurvedSectionConnector />

      {/* =========================================================================
          FLAGSHIP COURSES: 3D HORIZONTAL SCROLL JOURNEY (DYS, Stress to Strength, Vedic Leadership)
          ========================================================================= */}
      <VoicegurukulCourseCards />

      {/* 3D Flowing Curved Connecting Path between Courses and Photo Gallery */}
      <CurvedSectionConnector />

      {/* =========================================================================
          LIFE AT VOICE GURUKUL: Interactive Photo Gallery (Real Brochure Photos)
          ========================================================================= */}
      <section className="py-20 lg:py-28 bg-white border-b border-slate-100 relative z-10">
        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                Photo Gallery
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Life at VOICE Gurukul
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-normal">
                A glimpse into daily VOICE lifestyle camaraderie, campus auditorium seminars, early morning meditation, and wholesome meals.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Photos' },
                { id: 'workshops', label: 'Seminars' },
                { id: 'lifestyle', label: 'VOICE Lifestyle' },
                { id: 'meditation', label: 'Meditation' },
                { id: 'meals', label: 'Sattvic Meals' },
                { id: 'retreats', label: 'Nature Treks' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGalleryTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeGalleryTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Grid */}
          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredGallery.map((item, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  key={idx}
                  className="rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-lg hover:shadow-2xl hover:border-amber-400/60 transition-all group relative h-72 [perspective:1000px]"
                >
                  <DriveImage
                    driveId={item.driveId}
                    alt={item.title}
                    size={800}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                    showZoomIcon={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-6 pointer-events-none z-10">
                    <span className="self-start px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                      {item.tag}
                    </span>
                    <h4 className="text-lg font-bold text-white drop-shadow-md">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-200 mt-1 line-clamp-2">
                      {item.subtitle}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

        </div>
      </section>

      {/* =========================================================================
          VOICES OF TRANSFORMATION (Authentic Alumni & Student Impact)
          ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#fafcff] border-y border-slate-100 relative z-10">
        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              Real Impact
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Where Are VOICE Alumni Today?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg font-normal">
              Scholars who combined high academic competence with spiritual character now contributing worldwide.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {alumniList.map((alumnus, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="bg-white/95 backdrop-blur-sm rounded-3xl p-7 border border-slate-200/90 shadow-md hover:shadow-2xl hover:border-amber-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3.5">
                    <DriveImage 
                      driveId={alumnus.driveId} 
                      alt={alumnus.name}
                      size={300}
                      showZoomIcon={false}
                      className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 shadow-sm shrink-0"
                      imgClassName="w-full h-full object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{alumnus.name}</h4>
                      <p className="text-xs text-sky-700 font-semibold">{alumnus.college}</p>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full inline-block">
                    {alumnus.exam}
                  </p>

                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    “{alumnus.quote}”
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs font-medium text-slate-500">
                  Current Placement: <strong className="text-slate-800">{alumnus.role}</strong>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/stories"
              className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
            >
              <span>Read more student transformation stories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* =========================================================================
          THE CORE DONATION & PATRON ENGINE (80G Tax-Exempt Contributions)
          ========================================================================= */}
      <section id="donate" className="py-20 lg:py-28 bg-gradient-to-b from-[#181d24] via-[#12161c] to-[#0f1217] text-white relative overflow-hidden z-10">
        
        {/* Glow ambient lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 fill-amber-300" />
              <span>Sponsor a Student • Shape a Generation</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Invest in Youth. Transform the World.
            </h2>
            
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-light">
              Every contribution enables us to provide value education, clean ashram hostels, and wholesome nutritious meals to deserving university scholars.
            </p>
          </div>

          {/* Interactive Sponsorship Tiers Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {donationTiers.map((tier) => {
              const isSelected = selectedDonationTier === tier.amount && !customAmount;
              return (
                <motion.div
                  key={tier.amount}
                  whileHover={{ y: -6 }}
                  onClick={() => {
                    setSelectedDonationTier(tier.amount);
                    setCustomAmount('');
                  }}
                  className={`cursor-pointer rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between relative border ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/25 via-orange-500/15 to-transparent border-amber-400 shadow-xl shadow-amber-500/20 scale-105'
                      : 'bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-white/10'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                      {tier.badge}
                    </span>
                  )}

                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                      {tier.badge}
                    </span>
                    
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                        ₹{tier.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ package</span>
                    </div>

                    <h4 className="font-bold text-white text-base">
                      {tier.title}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      {tier.impact}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                      {isSelected ? '✓ Selected' : 'Select Package'}
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      isSelected ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-white/30 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Custom Amount & Checkout Action Bar */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
              
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Custom Contribution</span>
                <p className="text-sm text-slate-300">Enter any custom amount you wish to contribute:</p>
              </div>

              {/* Custom Input */}
              <div className="relative w-full sm:w-56">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                <input 
                  type="number"
                  placeholder="e.g. 2500"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/20 rounded-2xl pl-9 pr-4 py-3 text-white placeholder-slate-500 font-bold focus:outline-none focus:border-amber-400 text-sm font-mono"
                />
              </div>

            </div>

            {/* Donation Action Row */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">Total Selected Contribution:</span>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  ₹{currentDonationAmount.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <Link
                  href={`/collaborate#community`}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all text-center flex items-center justify-center space-x-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>Proceed to Donate</span>
                </Link>

                <button
                  onClick={() => setShowDonationModal(true)}
                  className="px-5 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all shrink-0"
                >
                  Direct Bank / UPI
                </button>
              </div>
            </div>

            {/* Trust and 80G Tax Exemption Strip */}
            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-slate-400">
              <div className="flex items-center justify-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>80G Tax Exemption (50% Relief)</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5">
                <Lock className="w-4 h-4 text-sky-400" />
                <span>100% Secure &amp; Verified</span>
              </div>
              <div className="flex items-center justify-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Reg. Public Trust: ISKCON NVCC Pune</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          CONTINUE YOUR JOURNEY: Multi-Page Discovery Portal
          ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#fafcff] relative z-10">
        <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wider">
              Explore VOICE Gurukul
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Continue Your Journey
            </h2>
            <p className="text-slate-600 text-base sm:text-lg font-normal">
              Discover local centres, institutional partnerships, student narratives, and volunteer opportunities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Page 1: Centres */}
            <Link href="/centres" className="group">
              <motion.div 
                whileHover={{ y: -8 }}
                className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-lg h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display group-hover:text-indigo-300 transition-colors">
                    Find 100+ Centres
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Locate student ashrams and study centres across Pune, Mumbai, Delhi, Bengaluru, and beyond.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Browse Centres</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </motion.div>
            </Link>

            {/* Page 2: Programmes */}
            <Link href="/programmes" className="group">
              <motion.div 
                whileHover={{ y: -8 }}
                className="rounded-3xl p-6 bg-gradient-to-br from-sky-900 to-slate-900 text-white shadow-lg h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display group-hover:text-sky-300 transition-colors">
                    All Programmes
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Review our complete 8-level sequential curriculum and 18 specialized leadership modules.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Courses</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </motion.div>
            </Link>

            {/* Page 3: Testimonials */}
            <Link href="/stories" className="group">
              <motion.div 
                whileHover={{ y: -8 }}
                className="rounded-3xl p-6 bg-gradient-to-br from-amber-900 to-slate-900 text-white shadow-lg h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display group-hover:text-amber-300 transition-colors">
                    Transformation Stories
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Multi-decade social proof, letters from university deans, and verified student career transformations.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Read Stories</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </motion.div>
            </Link>

            {/* Page 4: Collaborate & Partner */}
            <Link href="/collaborate" className="group">
              <motion.div 
                whileHover={{ y: -8 }}
                className="rounded-3xl p-6 bg-gradient-to-br from-purple-900 to-slate-900 text-white shadow-lg h-full flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-400/30">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display group-hover:text-purple-300 transition-colors">
                    Collaborate &amp; Partner
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    University seminars, NEP value courses, volunteer mentorship, and 80G tax-exempt meal sponsorships.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-purple-300 group-hover:translate-x-1 transition-transform">
                  <span>Collaborate With Us</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </motion.div>
            </Link>

          </div>

        </div>
      </section>

      {/* =========================================================================
          DIRECT BANK & UPI MODAL (Quick Scan & Pay for Indian Donors)
          ========================================================================= */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200">
            <button 
              onClick={() => setShowDonationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Direct Bank &amp; UPI Donation</h3>
              <p className="text-xs text-slate-500">ISKCON NVCC Pune • VOICE Youth Leadership Account</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-700 font-mono">
              <div><strong className="text-slate-900 font-sans">Account Name:</strong> ISKCON</div>
              <div><strong className="text-slate-900 font-sans">Bank:</strong> HDFC Bank Ltd</div>
              <div><strong className="text-slate-900 font-sans">Account No:</strong> 50100234567890</div>
              <div><strong className="text-slate-900 font-sans">IFSC Code:</strong> HDFC0000052</div>
              <div><strong className="text-slate-900 font-sans">UPI ID:</strong> iskcon.voice@hdfcbank</div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              💡 <em>After transferring, please share a screenshot to accounts@voicegurukul.com along with your PAN details to receive an instant 80G tax receipt.</em>
            </div>

            <Link
              href="/collaborate#community"
              onClick={() => setShowDonationModal(false)}
              className="block text-center py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md"
            >
              Online Payment Gateway →
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <PublicFooter />

    </div>
  );
}

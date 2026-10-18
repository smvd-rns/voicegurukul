'use client';

import { useState } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Building2,
  HeartHandshake,
  Users,
  Heart,
  Gift,
  Send,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  UserCheck,
  PhoneCall,
  Mail,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import CurriculumModal from '@/components/courses/CurriculumModal';
import { GURUKUL_8_LEVEL_CURRICULUM } from '@/components/courses/curriculumData';

// Smooth Bidirectional Scroll Animation Component
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: boolean;
}

function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  scale = false,
}: ScrollRevealProps) {
  const yOffset = direction === 'up' ? 32 : direction === 'down' ? -32 : 0;
  const xOffset = direction === 'left' ? 32 : direction === 'right' ? -32 : 0;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: yOffset,
        x: xOffset,
        scale: scale ? 0.96 : 1,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
      }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function CollaboratePage() {
  const { user } = useAuth();

  // Enquiry form state for Academic & Institutional tie-ups
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    designation: '',
    institution: '',
    email: '',
    phone: '',
    interest: 'seminar',
    message: ''
  });
  const [enquiryStatus, setEnquiryStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Active collaboration tab view
  const [activeTab, setActiveTab] = useState<'all' | 'institutions' | 'community'>('all');

  // Curriculum modal state & active level
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [curriculumActiveLevel, setCurriculumActiveLevel] = useState<number>(1);

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryStatus('submitting');
    setTimeout(() => {
      setEnquiryStatus('success');
      setEnquiryForm({
        name: '',
        designation: '',
        institution: '',
        email: '',
        phone: '',
        interest: 'seminar',
        message: ''
      });
      setTimeout(() => setEnquiryStatus('idle'), 6000);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-500 selection:text-white overflow-x-clip">
      {/* Ambient Chromatic Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-indigo-500/10 via-sky-400/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-[35%] -right-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[65%] -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(#6366f112_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      </div>

      {/* Sticky/Fixed Top Navbar */}
      <PublicNavbar />

      <main className="relative z-10 flex-1">
        {/* =========================================================
            HERO SECTION: Atmospheric Header & Live Count-Up Metrics
        ========================================================= */}
        <section className="relative pt-16 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-white/80 via-sky-50/30 to-[#f8fafc] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
            
            {/* Top Eyebrow Badge */}
            <ScrollReveal delay={0.05} scale>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-indigo-200/80 shadow-sm text-xs font-bold text-indigo-700 tracking-wide">
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
                <span>STRATEGIC COLLABORATION &amp; PARTNERSHIPS</span>
              </div>
            </ScrollReveal>

            {/* Main Title & Subtitle */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <ScrollReveal delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight font-display leading-[1.12]">
                  Partner With VOICE to{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600">
                    Empower Youth
                  </span>
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={0.15}>
                <p className="text-base sm:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed max-w-3xl mx-auto">
                  Uniting university leaders, corporate changemakers, student mentors, and benevolent sponsors to build character, resilience, and ethical leadership across India since 1996.
                </p>
              </ScrollReveal>
            </div>

            {/* Quick Filter Tabs */}
            <ScrollReveal delay={0.2} scale>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Opportunities
                </button>
                <button
                  onClick={() => setActiveTab('institutions')}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'institutions'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>University &amp; College Tie-ups</span>
                </button>
                <button
                  onClick={() => setActiveTab('community')}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'community'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Mentorship &amp; Meal Sponsorship</span>
                </button>
              </div>
            </ScrollReveal>

            {/* Quick Key Metrics with LIVE COUNT-UP COUNTERS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto text-left">
              
              <ScrollReveal delay={0.1} scale>
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-700 font-display">
                    <AnimatedCounter from={0} to={100} suffix="+" duration={1.8} />
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Colleges Partnered</p>
                  <p className="text-[10px] text-indigo-500 mt-0.5 font-medium">IITs, NITs, COEP &amp; Universities</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.15} scale>
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-sky-700 font-display">
                    <AnimatedCounter from={0} to={10000} suffix="+" duration={2.2} />
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Seminars Delivered</p>
                  <p className="text-[10px] text-sky-500 mt-0.5 font-medium">Stress &amp; Value Education</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2} scale>
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-700 font-display">
                    <AnimatedCounter from={0} to={15000} suffix="+" duration={2.4} />
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Alumni Leaders</p>
                  <p className="text-[10px] text-purple-500 mt-0.5 font-medium">Global Corporate Mentors</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.25} scale>
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-700 font-display">
                    <span>80G</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Tax-Exempt Donations</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">100% Tax Deductible (India)</p>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* =========================================================
            SECTION 1: UNIVERSITY & COLLEGE PARTNERSHIPS
        ========================================================= */}
        {(activeTab === 'all' || activeTab === 'institutions') && (
          <section id="colleges" className="py-16 sm:py-24 border-b border-slate-200/60 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
              
              <ScrollReveal>
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4 text-sky-600" />
                    <span>Academic Collaboration</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">
                    University Alliances &amp; NEP-Aligned Value Education
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Modern universities face mounting concerns over student mental fatigue, examination stress, smartphone addiction, and ethics. VOICE brings time-tested character-building frameworks to top campuses like COEP, NITs, and IITs.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid lg:grid-cols-12 gap-12 items-start">
                
                {/* Left: What We Offer Colleges */}
                <div className="lg:col-span-6 space-y-5">
                  
                  <ScrollReveal delay={0.05}>
                    <div className="bg-slate-50/90 rounded-3xl p-6 border border-slate-200/80 space-y-3 hover:border-indigo-300 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">NEP 2020 Value Education Courses</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-13">
                        Structured 6 to 12 week curriculum modules designed to integrate seamlessly into AICTE and National Education Policy value-credit mandates.
                      </p>
                    </div>
                  </ScrollReveal>

                  <ScrollReveal delay={0.1}>
                    <div className="bg-slate-50/90 rounded-3xl p-6 border border-slate-200/80 space-y-3 hover:border-sky-300 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Mind Management &amp; Focus Seminars</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-13">
                        High-energy 2-hour interactive sessions addressing concentration, overcoming procrastination, digital detox, and conquering exam anxiety.
                      </p>
                    </div>
                  </ScrollReveal>

                  <ScrollReveal delay={0.15}>
                    <div className="bg-slate-50/90 rounded-3xl p-6 border border-slate-200/80 space-y-3 hover:border-purple-300 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Youth Leadership Camps &amp; Retreats</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-13">
                        Weekend experiential nature retreats offering team bonding, interactive dramas, personal mentoring, and outdoor problem-solving challenges.
                      </p>
                    </div>
                  </ScrollReveal>

                  <ScrollReveal delay={0.2}>
                    <div className="bg-slate-50/90 rounded-3xl p-6 border border-slate-200/80 space-y-3 hover:border-emerald-300 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Substance De-Addiction &amp; Emotional Wellness</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-13">
                        Confidential peer counseling, positive social circles, and yogic lifestyle habits that help students build enduring inner stability.
                      </p>
                    </div>
                  </ScrollReveal>

                  {/* Reference to Testimonials */}
                  <ScrollReveal delay={0.25}>
                    <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-indigo-950">Endorsed by Top Educational Leaders</p>
                        <p className="text-[11px] text-indigo-700">Read official appreciation letters from NITK Surathkal, COEP Pune, and VNIT.</p>
                      </div>
                      <Link
                        href="/stories#formal-letters"
                        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm hover:scale-105"
                      >
                        <span>Read Letters</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </ScrollReveal>

                </div>

                {/* Right: Institutional Enquiry Form with Scroll Animation */}
                <div className="lg:col-span-6">
                  <ScrollReveal delay={0.2} scale>
                    <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-7 sm:p-10 shadow-2xl relative border border-white/10">
                      <div className="space-y-2 mb-6">
                        <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">ACADEMIC LIAISON</span>
                        <h3 className="text-2xl font-bold font-display text-white">
                          Institutional Enquiry Form
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Colleges, deans, and student coordinators can submit requirements below. Our academic outreach team responds within 24 business hours.
                        </p>
                      </div>

                      {enquiryStatus === 'success' ? (
                        <div className="bg-emerald-950/70 border border-emerald-500/80 text-emerald-200 p-8 rounded-2xl text-center space-y-3">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                          <h4 className="font-bold text-xl text-white">Enquiry Received!</h4>
                          <p className="text-xs text-emerald-300 leading-relaxed">
                            Thank you for connecting with VOICE Gurukul. Our academic collaboration coordinator will contact your institution shortly.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleEnquirySubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Full Name</label>
                              <input
                                type="text"
                                required
                                value={enquiryForm.name}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                                placeholder="Prof. / Dr. / Faculty Name"
                                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Designation</label>
                              <input
                                type="text"
                                required
                                value={enquiryForm.designation}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, designation: e.target.value })}
                                placeholder="Principal / HOD / TPO / Dean"
                                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">College / University Name</label>
                            <input
                              type="text"
                              required
                              value={enquiryForm.institution}
                              onChange={(e) => setEnquiryForm({ ...enquiryForm, institution: e.target.value })}
                              placeholder="e.g. COEP Technological University"
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Official Email</label>
                              <input
                                type="email"
                                required
                                value={enquiryForm.email}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                                placeholder="principal@college.edu"
                                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Phone Number</label>
                              <input
                                type="tel"
                                required
                                value={enquiryForm.phone}
                                onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Type of Engagement</label>
                            <select
                              value={enquiryForm.interest}
                              onChange={(e) => setEnquiryForm({ ...enquiryForm, interest: e.target.value })}
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                            >
                              <option value="seminar">Campus Seminar or Workshop</option>
                              <option value="nep-course">NEP Value Education Credit Course</option>
                              <option value="orientation">First-Year Student Induction Keynote</option>
                              <option value="retreat">Faculty / Student Leadership Retreat</option>
                              <option value="other">Custom Academic MoU</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Requirements &amp; Preferred Dates</label>
                            <textarea
                              rows={3}
                              value={enquiryForm.message}
                              onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                              placeholder="Approximate student count, department, semester timeline..."
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={enquiryStatus === 'submitting'}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2"
                          >
                            {enquiryStatus === 'submitting' ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit Institutional Request</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </ScrollReveal>
                </div>

              </div>

            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 2: COMMUNITY ENGAGEMENT, VOLUNTEERING & SPONSORSHIP
        ========================================================= */}
        {(activeTab === 'all' || activeTab === 'community') && (
          <section id="community" className="py-16 sm:py-24 border-b border-slate-200/60 bg-slate-50/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
              
              <ScrollReveal>
                <div className="text-center max-w-3xl mx-auto space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Community Engagement</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">
                    Ways to Participate &amp; Support the Mission
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Whether you are a university scholar seeking guidance, a working professional wanting to volunteer, or a philanthropist supporting meals—there is a place for you in VOICE.
                  </p>
                </div>
              </ScrollReveal>

              {/* 3 Main Action Cards with Staggered Scroll Animations */}
              <div className="grid md:grid-cols-3 gap-8">
                
                {/* Pathway 1: Join Student Programs */}
                <ScrollReveal delay={0.1} scale>
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between space-y-5 group h-full">
                    <div className="space-y-4">
                      {/* Thematic Vector Illustration */}
                      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-xs flex items-center justify-center">
                        <img
                          src="https://lh3.googleusercontent.com/d/1g4GixfRz0K1-PPGpRR13V9j6jrZWMD98"
                          alt="Join Student Programmes"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                          <span>University Youth</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 font-display">Join Student Programmes</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Enroll in our signature Discover Yourself modules, weekly campus sangas, and offline weekend retreats at our 120+ youth centres.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCurriculumModalOpen(true)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.02]"
                      >
                        <BookOpen className="w-4 h-4 group-hover:rotate-6 transition-transform" />
                        <span>View 8-Level Course Syllabus</span>
                      </button>

                      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">80 Interactive Topics</span>
                        <span>•</span>
                        <a href="#curriculum" className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                          <span>Browse On Page</span>
                          <span>↓</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Pathway 2: Volunteer Skills */}
                <ScrollReveal delay={0.2} scale>
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between space-y-5 group h-full">
                    <div className="space-y-4">
                      {/* Thematic Vector Illustration */}
                      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-xs flex items-center justify-center">
                        <img
                          src="https://lh3.googleusercontent.com/d/1y53-Zkh280l729m_TFrkqw-8dLlzNxmj"
                          alt="Volunteer Your Skills"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Professional Mentorship</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 font-display">Volunteer Your Skills</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Lend your expertise in mentoring, software development, video editing, seminar hosting, or campus counseling to inspire students.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <a
                        href="mailto:manager@voicepune.com?subject=Volunteer%20Interest%20-%20VOICE%20Gurukul"
                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md text-center block transition-all hover:scale-[1.02]"
                      >
                        Volunteer With Us
                      </a>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Pathway 3: Sponsor Yuva Meals */}
                <ScrollReveal delay={0.3} scale>
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between space-y-5 group h-full">
                    <div className="space-y-4">
                      {/* Thematic Vector Illustration */}
                      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-xs flex items-center justify-center">
                        <img
                          src="https://lh3.googleusercontent.com/d/1gsrinbCCKwYioUcpjzvrwvmDySrQeoU5"
                          alt="Sponsor Meals & Scholarships"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">
                          <Gift className="w-3.5 h-3.5 text-purple-600" />
                          <span>80G Tax-Exempt Giving</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 font-display">Sponsor Meals &amp; Scholarships</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Sponsor pure, nutritious Yuva Gurukul meals and educational aids for deserving students across India (100% 80G tax-exempt).
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Link
                        href="/dashboard/donations"
                        className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md text-center block transition-all hover:scale-[1.02]"
                      >
                        Sponsor &amp; Donate Now
                      </Link>
                    </div>
                  </div>
                </ScrollReveal>

              </div>

              {/* Comprehensive 8-Level Course Offerings Section */}
              <div id="curriculum" className="scroll-mt-28 space-y-8 pt-4">
                <ScrollReveal>
                  <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl space-y-8 relative overflow-hidden">
                    {/* Top ambient decorative blob */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Sequential Character &amp; Values Curriculum</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-display tracking-tight">
                          VOICE 8-Level Course Offerings
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                          8 sequential levels featuring 80 structured wisdom topics designed to guide university students from foundational habit building to executive leadership.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCurriculumModalOpen(true)}
                        className="shrink-0 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <Search className="w-3.5 h-3.5 text-sky-400" />
                        <span>Search All 80 Topics</span>
                      </button>
                    </div>

                    {/* Level Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {GURUKUL_8_LEVEL_CURRICULUM.map((lvl) => {
                        const isSelected = curriculumActiveLevel === lvl.level;
                        return (
                          <button
                            key={lvl.level}
                            type="button"
                            onClick={() => setCurriculumActiveLevel(lvl.level)}
                            className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
                              isSelected ? 'bg-white text-indigo-700' : 'bg-white text-slate-700 border border-slate-200'
                            }`}>
                              {lvl.level}
                            </span>
                            <span className="whitespace-nowrap">Level {lvl.level}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Level Detail Display */}
                    {(() => {
                      const cur = GURUKUL_8_LEVEL_CURRICULUM.find((l) => l.level === curriculumActiveLevel) || GURUKUL_8_LEVEL_CURRICULUM[0];
                      return (
                        <div className="space-y-6">
                          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-white/10">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-black uppercase">
                                  Level {cur.level}
                                </span>
                                <span className="text-xs font-bold text-sky-300">
                                  {cur.badge}
                                </span>
                              </div>
                              <h4 className="text-xl sm:text-2xl font-black font-display text-white">
                                “{cur.title}” Series
                              </h4>
                              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                                {cur.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCurriculumActiveLevel(cur.level);
                                setIsCurriculumModalOpen(true);
                              }}
                              className="shrink-0 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
                            >
                              <span>Open In Full Modal</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 10 Topics Grid */}
                          <div className="grid sm:grid-cols-2 gap-3.5">
                            {cur.topics.map((t, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 hover:bg-white hover:shadow-md transition-all flex items-start gap-3 group"
                              >
                                <span className="w-7 h-7 rounded-xl bg-white text-indigo-700 border border-indigo-100 font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-xs">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="space-y-0.5">
                                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug group-hover:text-indigo-950 transition-colors">
                                    {t}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    Level {cur.level} wisdom module
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </ScrollReveal>
              </div>

              {/* Sponsoring Impact Strip with LIVE COUNT-UP AMOUNTS */}
              <ScrollReveal delay={0.2} scale>
                <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 border border-white/10">
                  <div className="text-center max-w-2xl mx-auto space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                      <Heart className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Tax-Deductible Impact (80G)</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">
                      Every Contribution Reaches a Deserving Student
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Over 65% of students in engineering and medicine face high cost burdens. Your assistance provides nutritious meals, clean accommodation, and value-based literature.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-5 text-center">
                    
                    {/* Tier 1 */}
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2 hover:bg-white/10 transition-all hover:scale-105">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-sky-300 font-display">
                        <AnimatedCounter prefix="₹" to={1500} duration={1.6} />
                      </p>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Yuva Meal Sponsorship</p>
                      <p className="text-[11px] text-slate-300">Provides 30 wholesome, sanctified meals for college residents</p>
                    </div>

                    {/* Tier 2 */}
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2 hover:bg-white/10 transition-all hover:scale-105">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-300 font-display">
                        <AnimatedCounter prefix="₹" to={5000} duration={1.9} />
                      </p>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Semester Course Kit</p>
                      <p className="text-[11px] text-slate-300">Covers 1 student study materials, coursebooks, and retreat fee</p>
                    </div>

                    {/* Tier 3 */}
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2 hover:bg-white/10 transition-all hover:scale-105">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-300 font-display">
                        <AnimatedCounter prefix="₹" to={15000} duration={2.2} />
                      </p>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Full Gurukul Residency</p>
                      <p className="text-[11px] text-slate-300">1 month comprehensive student hostel stay, meals, and mentorship</p>
                    </div>

                  </div>

                  <div className="text-center pt-2">
                    <Link
                      href="/dashboard/donations"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-105"
                    >
                      <Heart className="w-4 h-4 fill-slate-950" />
                      <span>Contribute Online &amp; Receive 80G Receipt</span>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

            </div>
          </section>
        )}

        {/* Corporate CSR & General Contact CTA */}
        <section className="py-16 bg-white overflow-hidden">
          <ScrollReveal scale>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
                Looking for Corporate CSR or Regional Collaboration?
              </h3>
              <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed">
                We work with corporate CSR wings, educational trusts, and alumni groups to sponsor youth centers and digital value education.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <a
                  href="mailto:manager@voicepune.com?subject=CSR%20Collaboration%20Inquiry"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105"
                >
                  Connect With CSR Desk
                </a>
                <Link
                  href="/centres"
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all hover:scale-105"
                >
                  Locate Nearby Centre
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </main>

      <PublicFooter />

      {/* Interactive 8-Level Curriculum Modal */}
      <CurriculumModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
        initialLevel={curriculumActiveLevel}
      />
    </div>
  );
}

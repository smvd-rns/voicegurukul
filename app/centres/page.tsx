'use client';

import React from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import CollegeLogoSlider from '@/components/centres/CollegeLogoSlider';
import CentresMapExplorer from '@/components/centres/CentresMapExplorer';
import { MapPin, Sparkles } from 'lucide-react';

export default function CentresPage() {
  const centresList = [
    {
      city: 'Pune',
      region: 'Maharashtra',
      details: 'Serving COEP, MIT-WPU, PICT, VIIT, Cummins, Symbiosis & SPPU. The founding cradle of the youth movement since 1996.',
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Mumbai',
      region: 'Maharashtra',
      details: 'Serving IIT Bombay, VJTI, SPIT, DJ Sanghvi, ICT, TSEC & university campuses across Powai, Matunga, and Andheri.',
      image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Delhi-NCR',
      region: 'NCR / Delhi / Haryana',
      details: 'Serving DTU, NSUT, IIT Delhi, Jamia, Delhi University colleges, and NIT Kurukshetra.',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Bengaluru',
      region: 'Karnataka',
      details: 'Serving IISc Bangalore, RVCE, BMSCE, PES University, MSRIT & Electronic City engineering hubs.',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Hyderabad',
      region: 'Telangana',
      details: 'Serving IIT Hyderabad, NIT Warangal, Osmania, BITS Pilani Hyderabad & IIIT Hyderabad.',
      image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Kolkata & Kharagpur',
      region: 'West Bengal',
      details: 'Serving IIT Kharagpur, Jadavpur University, IIEST Shibpur & Calcutta University colleges.',
      image: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Gujarat (Surat & Ahmedabad)',
      region: 'Gujarat',
      details: 'Serving SVNIT Surat, IIT Gandhinagar, Nirma University, and PDPU engineering scholars.',
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'Rajasthan (Jaipur & Pilani)',
      region: 'Rajasthan',
      details: 'Serving BITS Pilani, MNIT Jaipur, IIT Jodhpur, and LNMIIT youth circles.',
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80',
    },
    {
      city: 'USA & International Chapters',
      region: 'Global / North America',
      details: 'Active youth forums at Harvard University, MIT, Northeastern University, UMass Amherst, and Chicago.',
      image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      <PublicNavbar />

      <main className="flex-1 space-y-12 lg:space-y-16 pb-20">
        {/* =====================================================================
            HERO HEADER
            ===================================================================== */}
        <section className="bg-gradient-to-b from-amber-50/80 via-sky-50/30 to-[#fafcff] py-12 lg:py-16 border-b border-amber-200/60 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 border border-amber-400/40 text-amber-900 text-xs font-black uppercase tracking-widest shadow-sm">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>VOICE Global Network • Where Can I Find VOICE?</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              100+ VOICE Centres Worldwide
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Explore our active student communities across Pune, all major Indian university hubs, and international chapters at top universities including Harvard &amp; MIT.
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <span className="px-3.5 py-1 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-amber-900 font-bold">
                🏛️ 100+ Centres
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-slate-800 font-bold">
                🎓 60+ Elite Universities
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-emerald-800 font-bold">
                🏙️ Pune (Since 1996)
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-sky-800 font-bold">
                🌎 USA &amp; Global Chapters
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 1: REALISTIC MAP EXPLORER (Pune, Across India & USA/Global)
            ===================================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CentresMapExplorer />
        </section>

        {/* =====================================================================
            SECTION 2: SLOW SINGLE-LINE UNIVERSITY LOGO SLIDER
            ===================================================================== */}
        <CollegeLogoSlider />

        {/* =====================================================================
            SECTION 3: STATE CHAPTERS & CITY CENTRES WITH PHOTOS
            ===================================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-wider">
              Academic Clusters
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Centres Across Different States
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Active student chapters providing values-based mentorship and positive peer association near your college campus.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {centresList.map((c, i) => (
              <div
                key={i}
                className="bg-white border-2 border-slate-200/90 hover:border-amber-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                    <img
                      src={c.image}
                      alt={c.city}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-slate-900 rounded-full text-[10px] font-bold uppercase shadow-sm">
                        {c.region}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-base font-black">{c.city}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {c.details}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

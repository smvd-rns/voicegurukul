'use client';

import React, { useState, useMemo } from 'react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';
import CollegeLogoSlider from '@/components/centres/CollegeLogoSlider';
import CentresMapExplorer from '@/components/centres/CentresMapExplorer';
import {
  MapPin,
  Sparkles,
  GraduationCap,
  Search,
  Building2,
  Globe2,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from 'lucide-react';

export interface VoiceCentreItem {
  id: string;
  name: string;
  city: string;
  state: string;
  region: 'Maharashtra' | 'Karnataka' | 'Telangana & AP' | 'Uttar Pradesh' | 'East India' | 'Tamil Nadu';
  address: string;
  image: string;
  colleges: string[];
  isHQ?: boolean;
}

const ACTUAL_VOICE_CENTRES: VoiceCentreItem[] = [
  {
    id: 'nvcc-pune',
    name: 'ISKCON NVCC Pune',
    city: 'Pune',
    state: 'Maharashtra',
    region: 'Maharashtra',
    isHQ: true,
    address: 'New Vedic Cultural Centre (NVCC), Katraj-Kondhwa Road, Tilekar Nagar, Pune',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'Sinhagad colleges, Wadgaon campus',
      'Sinhagad colleges, Narhe campus',
      'MMCOE Pune',
      'MIT, Pune',
      'PICT, Pune',
      'VIT Pune (Kondhwa)',
      'VIIT, Pune',
      'Modern college',
      'NIT Rourkela',
      'VSSUT Burla',
      'NIT Warangal',
      'IIT Hyderabad',
      'BITS Goa',
      'NIT Goa',
      'COET, Pune',
      'Raisoni Wagholi, Pune',
    ],
  },
  {
    id: 'pune-camp',
    name: 'ISKCON Pune Camp',
    city: 'Pune (Camp)',
    state: 'Maharashtra',
    region: 'Maharashtra',
    isHQ: true,
    address: '4 Tarapore Road, Camp, Pune, Maharashtra',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'COEP Pune',
      'AIT Pune',
      'AISSMS Pune',
      'Wadia Pune',
      'DY Patil Lohegaon Pune',
      'JSPM Hadapsar Pune',
      'BJ Medical Pune',
      'SRM Chennai',
    ],
  },
  {
    id: 'bcec-pune',
    name: 'ISKCON BCEC Pune',
    city: 'Pune (Tathawade)',
    state: 'Maharashtra',
    region: 'Maharashtra',
    address: 'Bhakti Center for Education and Culture (BCEC), Tathawade / Hinjewadi, Pune',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT Bombay',
      'IIM Bombay',
      'COEP Pune',
      'JSPM Tathawade Pune',
      'IISER Pune',
    ],
  },
  {
    id: 'abids-hyderabad',
    name: 'ISKCON Abids Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    region: 'Telangana & AP',
    isHQ: true,
    address: 'Sri Sri Radha Madanmohan Mandir, Nampally Station Road, Abids, Hyderabad',
    image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT Hyderabad',
      'IIIT Hyderabad',
      'BITS Hyderabad',
      'Chaitanya Bharati Institute of Technology',
      'Mahatma Gandhi Institute of Technology',
      'Vasavi College of Engineering',
      'MLR university',
      'CMR university',
      'VNR Engineering college',
      'MVSR Engineering college',
      'TKR Engineering College',
      'Guru Nanak Eng College',
      'Hyderabad Central University',
      'Osmania Medical College',
      'Srinidhi College of Engg',
      'Anurag University',
      'Keshav Memorial College of Engg',
      'Sri Indu College of Engg',
    ],
  },
  {
    id: 'juhu-mumbai',
    name: 'ISKCON Juhu',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'Maharashtra',
    isHQ: true,
    address: 'Sri Sri Radha Rasabihari Temple, Hare Krishna Land, Juhu, Mumbai',
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT Bombay',
      'NIT Surat',
      'NIT Jaipur',
      'NIT Raipur',
      'IIT Bhilai',
      'IIT Gandhinagar',
      'NIT Warangal',
      'NIT Andra Pradesh Tadepalli Gudem',
      'Sanjivani Institute Kopargaon, Near Shirdi',
      'Jalgaon',
      'Avasari',
      'SPC Mumbai',
      'Chikhali near Buldhana, Maharashtra',
      'CHOICE Wadala',
    ],
  },
  {
    id: 'icc-bengaluru',
    name: 'ICC Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    region: 'Karnataka',
    address: 'ISKCON Cultural Centre (ICC), Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'NIT Surathkal, Karnataka',
      'Manipal University',
      'BMS College, Bengaluru',
      'Dayananda Sagar Institution, Bengaluru',
      'RNSIT, Bengaluru',
      'IIM Bengaluru',
      'BNMIT Bengaluru',
      'PDA, Kalaburagi',
    ],
  },
  {
    id: 'sjm-bangalore',
    name: 'ISKCON Sheshadaripuram, Bangalore (SJM Bangalore)',
    city: 'Bengaluru (Sheshadripuram)',
    state: 'Karnataka',
    region: 'Karnataka',
    address: 'Sri Jagannath Mandir (SJM), Sheshadripuram, Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'Indian Institute of Science, Bengaluru',
      'PES University Banshankari & E-city Campus, Bengaluru',
      'RV College of Engineering, Bengaluru',
      'M.S. Ramaihah IT, Bengaluru',
      'IIIT Bangalore',
      'Bangalore Medical College',
      'SJCoE Mysore',
      'Corporate preaching in various areas.',
    ],
  },
  {
    id: 'kanpur',
    name: 'ISKCON Kanpur',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    region: 'Uttar Pradesh',
    address: 'Sri Sri Radha Madhav Mandir, Mainavati Marg, Bithoor Road, Kanpur',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'HBTU Kanpur',
      'CSJM Kanpur',
      'AITH Kanpur',
      'KNIT Sultanpur',
      'IET Lucknow',
      'IIIT Lucknow',
      'BIET Jhansi',
      'MMM Gorakhpur',
    ],
  },
  {
    id: 'newtown-kolkata',
    name: 'ISKCON Newtown, Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    region: 'East India',
    address: 'ISKCON Newtown, Action Area 1, Newtown, Kolkata, West Bengal',
    image: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT Kharagpur',
      'NIT Jamshedpur',
      'IIEST Shibpur',
      'Jadavpur University',
      'MERI',
      'Heritage Institute of Technology',
      'IEM (Institute of Engineering & Management)',
    ],
  },
  {
    id: 'warangal',
    name: 'ISKCON Warangal',
    city: 'Warangal',
    state: 'Telangana',
    region: 'Telangana & AP',
    address: 'ISKCON Temple, Mulugu Road, Warangal, Telangana',
    image: 'https://images.unsplash.com/photo-1626014303757-6466336e4093?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'NIT Warangal',
      'KITS Warangal',
      'GRIET College Hyderabad',
      'VNR College Hyderabad',
      'JNTU Hyderabad',
      'Acarya Nagarjuna University, Pedakakani',
    ],
  },
  {
    id: 'prayagraj',
    name: 'ISKCON Prayagraj',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    region: 'Uttar Pradesh',
    address: 'ISKCON Temple, Kydganj / Baluaghat, Prayagraj, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1596405835955-460b5e408544?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'Motilal Nehru National Institute of Technology, Prayagraj',
      'Indian Institute of Information Technology, Prayagraj',
      'Allahabad University, Prayagraj',
      'Shambhunath Institute of Engineering and Technology, Prayagraj',
      'Institute of Engineering and Rural Technology, Prayagraj',
    ],
  },
  {
    id: 'varanasi',
    name: 'ISKCON Varanasi',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    region: 'Uttar Pradesh',
    address: 'ISKCON Varanasi, Bhelupur / Lanka, Varanasi, Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT BHU (Varanasi)',
      'BHU University (Varanasi)',
      'Institute of Medical Sciences BHU (Varanasi)',
      'Mahatma Gandhi Kashi Vidya Pitha (Varanasi)',
    ],
  },
  {
    id: 'thane',
    name: 'ISKCON Thane',
    city: 'Thane',
    state: 'Maharashtra',
    region: 'Maharashtra',
    address: 'ISKCON Temple, Ghodbunder Road, Thane West, Maharashtra',
    image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'SGGSIE&T, Nanded',
      'MIT, Sambhajinagar',
      'MIMSR Medical college, Latur',
      'Bidwe College, Latur',
    ],
  },
  {
    id: 'vijaywada',
    name: 'ISKCON Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    region: 'Telangana & AP',
    address: 'ISKCON Temple, Bundar Road / Undavalli, Vijayawada, Andhra Pradesh',
    image: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'VIT, AP',
      'KL University',
      'AIIMS',
    ],
  },
  {
    id: 'dharwad',
    name: 'ISKCON Dharwad Hubballi',
    city: 'Dharwad & Hubballi',
    state: 'Karnataka',
    region: 'Karnataka',
    address: 'ISKCON Centre, Rayapur / Hubballi-Dharwad Bypass, Karnataka',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT Dharwad',
      'IIIT Dharwad',
      'BVB Hubballi',
    ],
  },
  {
    id: 'dhanbad',
    name: 'ISKCON Dhanbad',
    city: 'Dhanbad',
    state: 'Jharkhand',
    region: 'East India',
    address: 'ISKCON Centre, Near IIT ISM Campus, Dhanbad, Jharkhand',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'IIT ISM Dhanbad',
      'BIT Sindri',
    ],
  },
  {
    id: 'trichy',
    name: 'ISKCON Trichy',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    region: 'Tamil Nadu',
    address: 'ISKCON Trichy, Near NIT Trichy, Thuvakudi, Tiruchirappalli, Tamil Nadu',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    colleges: [
      'NIT Trichy',
    ],
  },
];

const GLOBAL_CHAPTERS = [
  {
    name: 'Harvard University Chapter',
    campus: 'Cambridge, Massachusetts, USA',
    colleges: 'Harvard College, Harvard Graduate Schools & Affiliates',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'MIT (Massachusetts Institute of Technology)',
    campus: 'Cambridge, Massachusetts, USA',
    colleges: 'MIT School of Engineering & Science Scholars',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Northeastern University Chapter',
    campus: 'Boston, Massachusetts, USA',
    colleges: 'Northeastern Engineering & Computer Science',
    image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'UMass Amherst Chapter',
    campus: 'Amherst, Massachusetts, USA',
    colleges: 'University of Massachusetts Amherst Students',
    image: 'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'University of Chicago & Midwest Chapter',
    campus: 'Chicago, Illinois, USA',
    colleges: 'University of Chicago, Northwestern, UIC & UIUC',
    image: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=600&q=80',
  },
];

export default function CentresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const regions = ['All', 'Maharashtra', 'Karnataka', 'Telangana & AP', 'Uttar Pradesh', 'East India', 'Tamil Nadu'];

  // Total colleges count
  const totalCollegesCount = useMemo(() => {
    return ACTUAL_VOICE_CENTRES.reduce((acc, c) => acc + c.colleges.length, 0);
  }, []);

  // Filtered centres
  const filteredCentres = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ACTUAL_VOICE_CENTRES.filter((c) => {
      const matchesRegion = selectedRegion === 'All' || c.region === selectedRegion;
      if (!matchesRegion) return false;

      if (!q) return true;

      const inName = c.name.toLowerCase().includes(q);
      const inCity = c.city.toLowerCase().includes(q);
      const inState = c.state.toLowerCase().includes(q);
      const inAddress = c.address.toLowerCase().includes(q);
      const inColleges = c.colleges.some((col) => col.toLowerCase().includes(q));

      return inName || inCity || inState || inAddress || inColleges;
    });
  }, [searchQuery, selectedRegion]);

  const scrollToMap = () => {
    const el = document.getElementById('map-explorer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafcff] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      <PublicNavbar />

      <main className="flex-1 space-y-12 lg:space-y-16 pb-20">
        {/* =====================================================================
            HERO HEADER - VOICE PREACHING IN 120 COLLEGES ACROSS INDIA
            ===================================================================== */}
        <section className="bg-gradient-to-b from-amber-50/80 via-sky-50/30 to-[#fafcff] py-12 lg:py-16 border-b border-amber-200/60 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 border border-amber-400/40 text-amber-900 text-xs font-black uppercase tracking-widest shadow-sm">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>VOICE Network • Where Can I Find VOICE?</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              VOICE Preaching in 120 Colleges across India
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Explore our 17 dedicated ISKCON youth centres empowering students with Vedic wisdom, character, and mental clarity across 120+ premier engineering and medical colleges nationwide, alongside top international university chapters.
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-amber-900 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                17 ISKCON Centres
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-slate-800 font-bold flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                120+ Colleges Preached
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                Pune Hub (Since 1996)
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white border border-amber-300 shadow-sm text-xs text-sky-800 font-bold flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-sky-600" />
                USA &amp; Global Chapters
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 1: REALISTIC MAP EXPLORER (Pune, Across India & USA/Global)
            ===================================================================== */}
        <section id="map-explorer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <CentresMapExplorer />
        </section>

        {/* =====================================================================
            SECTION 2: SLOW SINGLE-LINE UNIVERSITY LOGO SLIDER
            ===================================================================== */}
        <CollegeLogoSlider />

        {/* =====================================================================
            SECTION 3: ACTUAL 17 ISKCON CENTRES & 120 COLLEGES DIRECTORY
            ===================================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-wider inline-block">
                All India Campus Preaching
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                All 17 ISKCON VOICE Centres &amp; Campus List
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Browse our active student centres or search directly for your college to find the affiliated ISKCON youth centre.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToMap}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-amber-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm shrink-0 self-start md:self-auto"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Locate on Map</span>
            </button>
          </div>

          {/* Search Bar & Region Filters */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-slate-200/90 shadow-sm space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by your college (e.g. PICT, IIT BHU, NIT Warangal, HBTU, Sinhagad, Manipal), city or centre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Region Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
                Filter Region:
              </span>
              {regions.map((region) => {
                const isSelected = selectedRegion === region;
                const count =
                  region === 'All'
                    ? ACTUAL_VOICE_CENTRES.length
                    : ACTUAL_VOICE_CENTRES.filter((c) => c.region === region).length;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{region}</span>
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800">{filteredCentres.length}</strong> centres
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <span className="font-semibold text-amber-700">
              Total {totalCollegesCount} Colleges Documented
            </span>
          </div>

          {/* Centres Grid */}
          {filteredCentres.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white border border-slate-200 space-y-3">
              <p className="text-base font-bold text-slate-700">No centres found matching your search.</p>
              <p className="text-xs text-slate-500">Try searching for the college abbreviation (e.g., NIT, IIT, COEP, BITS).</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRegion('All');
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {filteredCentres.map((centre) => {
                const isExpanded = !!expandedCards[centre.id];
                const displayColleges = isExpanded ? centre.colleges : centre.colleges.slice(0, 5);
                const hasMore = centre.colleges.length > 5;

                return (
                  <div
                    key={centre.id}
                    className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Image Banner */}
                      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={centre.image}
                          alt={centre.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-slate-900 rounded-full text-[10px] font-bold uppercase shadow-sm">
                            {centre.city}, {centre.state}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black uppercase shadow-sm">
                            🎓 {centre.colleges.length} Colleges
                          </span>
                        </div>

                        {/* Centre Name in Banner */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h3 className="text-base font-black text-white leading-tight">
                            {centre.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-4">
                        {/* Address */}
                        <div className="flex items-start space-x-2 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="line-clamp-2 text-[11px] leading-relaxed">{centre.address}</p>
                        </div>

                        {/* Colleges List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                            Preaching Campuses ({centre.colleges.length}):
                          </span>

                          <div className="space-y-1.5">
                            {displayColleges.map((col, idx) => {
                              const isMatch =
                                searchQuery &&
                                col.toLowerCase().includes(searchQuery.toLowerCase().trim());
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-start space-x-2 p-1.5 rounded-lg border text-xs transition-colors ${
                                    isMatch
                                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-950'
                                      : 'bg-slate-50 border-slate-200/80 text-slate-700'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded-full bg-white border border-slate-200 text-[10px] font-black flex items-center justify-center shrink-0 text-slate-700">
                                    {idx + 1}
                                  </span>
                                  <span className="text-[11px] font-medium leading-snug truncate">
                                    {col}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Show More / Show Less Toggle */}
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(centre.id)}
                              className="w-full py-1 text-center text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center justify-center gap-1 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show Less</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>View all {centre.colleges.length} colleges (+{centre.colleges.length - 5} more)</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={scrollToMap}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-amber-400 text-slate-800 hover:text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>View on Interactive Map</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================================
            SECTION 4: INTERNATIONAL UNIVERSITY CHAPTERS
            ===================================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-6 border border-amber-400/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-400/30">
                  Global Outreach
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  VOICE International University Chapters
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Mentoring Indian and international scholars pursuing higher studies at Ivy League and top world universities.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-amber-300 font-bold bg-white/10 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
                <Globe2 className="w-4 h-4 text-amber-400" />
                <span>USA &amp; Worldwide</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GLOBAL_CHAPTERS.map((chap, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <h4 className="text-sm font-bold text-white truncate">{chap.name}</h4>
                  </div>
                  <p className="text-[11px] text-amber-200/90 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {chap.campus}
                  </p>
                  <p className="text-xs text-slate-300 font-medium">{chap.colleges}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

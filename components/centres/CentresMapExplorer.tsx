'use client';

import React, { useState, useRef } from 'react';
import {
  MapPin,
  Globe2,
  Building2,
  Search,
  Compass,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface CentreLocation {
  id: string;
  name: string;
  shortName: string;
  category: 'pune' | 'india' | 'global';
  area: string;
  colleges: string;
  address: string;
  lat: number;
  lng: number;
  isHQ?: boolean;
  embedQuery: string;
}

export const PUNE_CENTRES: CentreLocation[] = [
  {
    id: 'pune-viman',
    name: 'Viman Nagar (Near Airport)',
    shortName: 'Viman Nagar',
    category: 'pune',
    area: 'Viman Nagar / Airport Road',
    colleges: 'Symbiosis International, AIT, MIT AOE, Dhole Patil',
    address: 'Near Pune International Airport, Viman Nagar, Pune',
    lat: 18.5679,
    lng: 73.9143,
    isHQ: true,
    embedQuery: 'Viman+Nagar+Pune+Maharashtra',
  },
  {
    id: 'pune-shivaji',
    name: 'Shivaji Nagar',
    shortName: 'Shivaji Nagar',
    category: 'pune',
    area: 'Shivaji Nagar / FC Road',
    colleges: 'COEP Technological Univ, Fergusson College, BMCC, Modern College',
    address: 'Near COEP Campus, Shivaji Nagar, Pune',
    lat: 18.5314,
    lng: 73.8446,
    isHQ: true,
    embedQuery: 'COEP+Shivaji+Nagar+Pune',
  },
  {
    id: 'pune-kothrud',
    name: 'Kothrud (MIT-WPU & Cummins)',
    shortName: 'Kothrud',
    category: 'pune',
    area: 'Kothrud / Karve Nagar',
    colleges: 'MIT-WPU, Cummins College of Engg, Marathwada Mitra Mandal',
    address: 'Near MIT Campus, Paud Road, Kothrud, Pune',
    lat: 18.5074,
    lng: 73.8077,
    embedQuery: 'MIT+WPU+Paud+Road+Kothrud+Pune',
  },
  {
    id: 'pune-katraj',
    name: 'Katraj (PICT & VIIT)',
    shortName: 'Katraj',
    category: 'pune',
    area: 'Katraj / Dhankawadi',
    colleges: 'PICT, VIIT, Bharati Vidyapeeth, SKN Sinhgad',
    address: 'Near PICT College, Dhankawadi, Pune',
    lat: 18.4575,
    lng: 73.8508,
    embedQuery: 'PICT+Dhankawadi+Katraj+Pune',
  },
  {
    id: 'pune-koregaon',
    name: 'Koregaon Park',
    shortName: 'Koregaon Park',
    category: 'pune',
    area: 'Koregaon Park / Bund Garden',
    colleges: 'Wadia College, Ness Wadia, Ruby Hall Medical, St. Mira’s',
    address: 'North Main Road, Koregaon Park, Pune',
    lat: 18.5362,
    lng: 73.894,
    embedQuery: 'Koregaon+Park+Pune+Maharashtra',
  },
  {
    id: 'pune-yerawada',
    name: 'Yerawada',
    shortName: 'Yerawada',
    category: 'pune',
    area: 'Yerawada',
    colleges: 'Deccan College, Don Bosco, Commerzone IT Park scholars',
    address: 'Airport Road Junction, Yerawada, Pune',
    lat: 18.5529,
    lng: 73.8797,
    embedQuery: 'Yerawada+Pune+Maharashtra',
  },
  {
    id: 'pune-khadki',
    name: 'Khadki & Aundh',
    shortName: 'Khadki',
    category: 'pune',
    area: 'Khadki / Bopodi',
    colleges: 'SPPU (Pune University), Spicer University, Gokhale Institute',
    address: 'Old Mumbai-Pune Highway, Khadki, Pune',
    lat: 18.5642,
    lng: 73.8313,
    embedQuery: 'Khadki+Pune+Maharashtra',
  },
  {
    id: 'pune-kharadi',
    name: 'Kharadi',
    shortName: 'Kharadi',
    category: 'pune',
    area: 'Kharadi / EON Free Zone',
    colleges: 'Dhole Patil College of Engg, JSPM Wagholi, Tech professionals',
    address: 'Near EON IT Park & WTC, Kharadi, Pune',
    lat: 18.5516,
    lng: 73.9535,
    embedQuery: 'Kharadi+Pune+Maharashtra',
  },
  {
    id: 'pune-magarpatta',
    name: 'Magarpatta City & Hadapsar',
    shortName: 'Magarpatta City',
    category: 'pune',
    area: 'Magarpatta City / Hadapsar',
    colleges: 'PVPIT, JSPM Hadapsar, Cybercity tech scholars',
    address: 'Near Mega Centre, Magarpatta City, Hadapsar, Pune',
    lat: 18.5134,
    lng: 73.9268,
    embedQuery: 'Magarpatta+City+Hadapsar+Pune',
  },
];

export const INDIA_CENTRES: CentreLocation[] = [
  {
    id: 'india-pune',
    name: 'Pune (Central Headquarters)',
    shortName: 'Pune',
    category: 'india',
    area: 'Maharashtra (Western Hub)',
    colleges: 'COEP, PICT, MIT-WPU, VIIT, Cummins, Symbiosis, SPPU',
    address: 'Pune, Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    isHQ: true,
    embedQuery: 'Pune+Maharashtra+India',
  },
  {
    id: 'india-mumbai',
    name: 'Mumbai',
    shortName: 'Mumbai',
    category: 'india',
    area: 'Maharashtra (Mumbai Hub)',
    colleges: 'IIT Bombay, VJTI, SPIT, DJ Sanghvi, TSEC, ICT',
    address: 'Powai, Matunga, Andheri & Navi Mumbai',
    lat: 19.076,
    lng: 72.8777,
    embedQuery: 'IIT+Bombay+Powai+Mumbai',
  },
  {
    id: 'india-delhi',
    name: 'Delhi-NCR',
    shortName: 'Delhi-NCR',
    category: 'india',
    area: 'Delhi / NCR / Haryana',
    colleges: 'IIT Delhi, DTU, NSUT, Jamia, Delhi University, NIT Kurukshetra',
    address: 'New Delhi, Noida, Gurugram, Kurukshetra',
    lat: 28.6139,
    lng: 77.209,
    embedQuery: 'IIT+Delhi+Hauz+Khas+New+Delhi',
  },
  {
    id: 'india-bengaluru',
    name: 'Bengaluru',
    shortName: 'Bengaluru',
    category: 'india',
    area: 'Karnataka (Silicon Valley)',
    colleges: 'IISc, RVCE, BMSCE, PES University, MSRIT, IIIT-B',
    address: 'Rajajinagar, Whitefield, Electronic City, Bengaluru',
    lat: 12.9716,
    lng: 77.5946,
    embedQuery: 'Indian+Institute+of+Science+Bengaluru',
  },
  {
    id: 'india-hyderabad',
    name: 'Hyderabad',
    shortName: 'Hyderabad',
    category: 'india',
    area: 'Telangana',
    colleges: 'IIT Hyderabad, NIT Warangal, BITS Pilani Hyderabad, Osmania',
    address: 'Gachibowli, Secunderabad, Warangal',
    lat: 17.385,
    lng: 78.4867,
    embedQuery: 'IIT+Hyderabad+Telangana',
  },
  {
    id: 'india-kolkata',
    name: 'Kolkata & Kharagpur',
    shortName: 'Kolkata',
    category: 'india',
    area: 'West Bengal',
    colleges: 'IIT Kharagpur, Jadavpur University, IIEST Shibpur, Calcutta Univ',
    address: 'Kolkata & Kharagpur, West Bengal',
    lat: 22.5726,
    lng: 88.3639,
    embedQuery: 'IIT+Kharagpur+West+Bengal',
  },
  {
    id: 'india-surat',
    name: 'Gujarat (Surat & Ahmedabad)',
    shortName: 'Gujarat',
    category: 'india',
    area: 'Gujarat',
    colleges: 'SVNIT Surat, IIT Gandhinagar, Nirma University, PDPU',
    address: 'Surat & Ahmedabad, Gujarat',
    lat: 21.1702,
    lng: 72.8311,
    embedQuery: 'SVNIT+Surat+Gujarat',
  },
  {
    id: 'india-jaipur',
    name: 'Rajasthan (Jaipur & Pilani)',
    shortName: 'Rajasthan',
    category: 'india',
    area: 'Rajasthan',
    colleges: 'BITS Pilani, MNIT Jaipur, IIT Jodhpur, LNMIIT',
    address: 'Jaipur & Pilani, Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    embedQuery: 'MNIT+Jaipur+Rajasthan',
  },
  {
    id: 'india-up',
    name: 'Uttar Pradesh (Kanpur & Varanasi)',
    shortName: 'Uttar Pradesh',
    category: 'india',
    area: 'Uttar Pradesh & Uttarakhand',
    colleges: 'IIT Kanpur, IIT BHU Varanasi, IIT Roorkee, MNNIT Prayagraj',
    address: 'Kanpur, Varanasi, Prayagraj, Roorkee',
    lat: 26.4499,
    lng: 80.3319,
    embedQuery: 'IIT+Kanpur+Uttar+Pradesh',
  },
  {
    id: 'india-chennai',
    name: 'Chennai & Trichy',
    shortName: 'Chennai',
    category: 'india',
    area: 'Tamil Nadu',
    colleges: 'IIT Madras, NIT Trichy, Anna University, VIT Vellore',
    address: 'Chennai, Trichy, Vellore',
    lat: 13.0827,
    lng: 80.2707,
    embedQuery: 'IIT+Madras+Chennai',
  },
];

export const GLOBAL_CENTRES: CentreLocation[] = [
  {
    id: 'global-harvard',
    name: 'Harvard University (Cambridge)',
    shortName: 'Harvard University',
    category: 'global',
    area: 'Cambridge, Massachusetts, USA',
    colleges: 'Harvard College, Harvard Graduate Schools & MIT Affiliates',
    address: 'Cambridge, MA, United States',
    lat: 42.377,
    lng: -71.1167,
    isHQ: true,
    embedQuery: 'Harvard+University+Cambridge+MA+USA',
  },
  {
    id: 'global-mit',
    name: 'MIT - Massachusetts Institute of Technology',
    shortName: 'MIT',
    category: 'global',
    area: 'Cambridge, Massachusetts, USA',
    colleges: 'MIT School of Engineering & Science Scholars',
    address: 'Cambridge, MA, United States',
    lat: 42.3601,
    lng: -71.0942,
    isHQ: true,
    embedQuery: 'Massachusetts+Institute+of+Technology+Cambridge+MA',
  },
  {
    id: 'global-northeastern',
    name: 'Northeastern University',
    shortName: 'Northeastern University',
    category: 'global',
    area: 'Boston, Massachusetts, USA',
    colleges: 'Northeastern Engineering & Computer Science',
    address: 'Boston, MA, United States',
    lat: 42.3398,
    lng: -71.0892,
    embedQuery: 'Northeastern+University+Boston+MA',
  },
  {
    id: 'global-umass',
    name: 'UMass Amherst',
    shortName: 'UMass Amherst',
    category: 'global',
    area: 'Amherst, Massachusetts, USA',
    colleges: 'University of Massachusetts Amherst Students',
    address: 'Amherst, MA, United States',
    lat: 42.3868,
    lng: -72.5301,
    embedQuery: 'UMass+Amherst+Amherst+MA',
  },
  {
    id: 'global-chicago',
    name: 'University of Chicago & Midwest',
    shortName: 'Chicago',
    category: 'global',
    area: 'Chicago, Illinois, USA',
    colleges: 'Univ of Chicago, Northwestern University, UIC, UIUC',
    address: 'Chicago, IL, United States',
    lat: 41.7886,
    lng: -87.5987,
    embedQuery: 'University+of+Chicago+Hyde+Park+Chicago+IL',
  },
];

export default function CentresMapExplorer() {
  const [activeTab, setActiveTab] = useState<'pune' | 'india' | 'global'>('pune');
  const [selectedCentre, setSelectedCentre] = useState<CentreLocation>(PUNE_CENTRES[0]);
  const [searchFilter, setSearchFilter] = useState('');
  const quickJumpScrollRef = useRef<HTMLDivElement>(null);

  const currentCentres =
    activeTab === 'pune'
      ? PUNE_CENTRES
      : activeTab === 'india'
      ? INDIA_CENTRES
      : GLOBAL_CENTRES;

  const filteredCentres = currentCentres.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.area.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.colleges.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Smooth scroll handler for Quick Jump bar using mouse wheel or arrows
  const handleQuickJumpWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (quickJumpScrollRef.current) {
      quickJumpScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollQuickJump = (direction: 'left' | 'right') => {
    if (quickJumpScrollRef.current) {
      quickJumpScrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  // Realistic map embed URL pointing directly to the real geographic coordinates
  const getMapEmbedUrl = () => {
    if (selectedCentre) {
      const zoom = selectedCentre.category === 'pune' ? 14 : selectedCentre.category === 'india' ? 12 : 14;
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        selectedCentre.embedQuery
      )}&t=m&z=${zoom}&output=embed`;
    }

    if (activeTab === 'pune') {
      return `https://maps.google.com/maps?q=Pune+Maharashtra+India&t=m&z=12&output=embed`;
    }
    if (activeTab === 'india') {
      return `https://maps.google.com/maps?q=India&t=m&z=5&output=embed`;
    }
    return `https://maps.google.com/maps?q=Boston+Cambridge+MA+USA&t=m&z=11&output=embed`;
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TAB CONTROLS: PUNE, ACROSS INDIA, OUTSIDE INDIA (Clean titles)
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shadow-xl border border-amber-400/30">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pune');
              setSelectedCentre(PUNE_CENTRES[0]);
              setSearchFilter('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'pune'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏙️ Pune</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('india');
              setSelectedCentre(INDIA_CENTRES[0]);
              setSearchFilter('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'india'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>🇮🇳 Across India</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('global');
              setSelectedCentre(GLOBAL_CENTRES[0]);
              setSearchFilter('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>🌎 Outside India</span>
          </button>
        </div>

        {/* Selected Region Label */}
        <div className="text-xs text-amber-300 font-semibold px-3 py-1 rounded-lg bg-black/40 border border-white/10">
          {activeTab === 'pune' && 'Pune Region'}
          {activeTab === 'india' && 'National Network'}
          {activeTab === 'global' && 'International Chapters'}
        </div>
      </div>

      {/* =====================================================================
          QUICK JUMP BAR WITH MOUSE-WHEEL SCROLLING & ARROW BUTTONS
          (No ugly scrollbar, easily scrollable with mouse wheel or clicks)
          ===================================================================== */}
      <div className="relative flex items-center gap-2">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scrollQuickJump('left')}
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900 shadow-sm shrink-0 transition-colors"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
          Quick Jump:
        </span>

        {/* Scrollable Container with onWheel support and hidden scrollbar */}
        <div
          ref={quickJumpScrollRef}
          onWheel={handleQuickJumpWheel}
          className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full"
        >
          {currentCentres.map((centre) => {
            const isSelected = selectedCentre?.id === centre.id;
            return (
              <button
                key={centre.id}
                type="button"
                onClick={() => setSelectedCentre(centre)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black border-amber-500 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950 fill-slate-950' : 'text-amber-600'}`} />
                <span>{centre.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => scrollQuickJump('right')}
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900 shadow-sm shrink-0 transition-colors"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* =====================================================================
          REALISTIC MAP CANVAS (Live Real Map) & DETAIL CARD SPLIT
          ===================================================================== */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Real Interactive Map Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-xl flex flex-col">
            {/* Top Bar with Centre Area Title */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center font-black shrink-0">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-black text-white truncate">
                    {selectedCentre ? selectedCentre.name : 'Select a Location'}
                  </h4>
                  <p className="text-[11px] text-amber-200/80 truncate">
                    {selectedCentre ? selectedCentre.address : 'Click any location to view on realistic map'}
                  </p>
                </div>
              </div>
            </div>

            {/* REALISTIC LIVE MAP EMBED (Real roads, terrain, labels, and landmarks) */}
            <div className="relative w-full h-[460px] sm:h-[540px] bg-slate-100">
              <iframe
                title="Realistic Location Map"
                src={getMapEmbedUrl()}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Location Details & Search Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Centre Details Card */}
          <div className="p-5 rounded-3xl bg-white border-2 border-amber-300 shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  {selectedCentre?.category === 'pune'
                    ? 'Pune'
                    : selectedCentre?.category === 'india'
                    ? 'India'
                    : 'International'}
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1.5 leading-snug">
                  {selectedCentre?.name}
                </h4>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Affiliated Colleges:
                </span>
                <p className="font-semibold text-slate-900">{selectedCentre?.colleges}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  Area / Vicinity:
                </span>
                <p className="font-medium text-slate-800">{selectedCentre?.address}</p>
              </div>
            </div>
          </div>

          {/* Search Filter Directory */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by city, area, or college..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
              {filteredCentres.map((c) => {
                const isSelected = selectedCentre?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCentre(c)}
                    className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-semibold text-[11px]">{c.shortName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{c.area}</p>
                    </div>
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-700' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

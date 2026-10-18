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
  collegesList?: string[];
  address: string;
  lat: number;
  lng: number;
  isHQ?: boolean;
  embedQuery: string;
}

export const PUNE_CENTRES: CentreLocation[] = [
  {
    id: 'pune-nvcc',
    name: 'ISKCON NVCC Pune',
    shortName: 'NVCC Pune',
    category: 'pune',
    area: 'Katraj-Kondhwa Road, Tilekar Nagar, Pune',
    colleges: 'Sinhagad Wadgaon, Sinhagad Narhe, MMCOE, MIT, PICT, VIT Pune, VIIT, Modern College, NIT Rourkela, VSSUT Burla, NIT Warangal, IIT Hyderabad, BITS Goa, NIT Goa, COET, Raisoni Wagholi',
    collegesList: [
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
    address: 'New Vedic Cultural Centre (NVCC), Katraj-Kondhwa Road, Tilekar Nagar, Pune, Maharashtra 411048',
    lat: 18.4489,
    lng: 73.8812,
    isHQ: true,
    embedQuery: 'ISKCON+NVCC+Pune+Katraj+Kondhwa+Road',
  },
  {
    id: 'pune-camp',
    name: 'ISKCON Pune Camp',
    shortName: 'Pune Camp',
    category: 'pune',
    area: 'Camp / Tarapore Road, Pune',
    colleges: 'COEP Pune, AIT Pune, AISSMS Pune, Wadia Pune, DY Patil Lohegaon Pune, JSPM Hadapsar Pune, BJ Medical Pune, SRM Chennai',
    collegesList: [
      'COEP Pune',
      'AIT Pune',
      'AISSMS Pune',
      'Wadia Pune',
      'DY Patil Lohegaon Pune',
      'JSPM Hadapsar Pune',
      'BJ Medical Pune',
      'SRM Chennai',
    ],
    address: '4 Tarapore Road, Camp, Pune, Maharashtra 411001',
    lat: 18.5147,
    lng: 73.8787,
    isHQ: true,
    embedQuery: 'ISKCON+Pune+Camp+Tarapore+Road',
  },
  {
    id: 'pune-bcec',
    name: 'ISKCON BCEC Pune',
    shortName: 'BCEC Tathawade',
    category: 'pune',
    area: 'Tathawade & Hinjewadi, Pune',
    colleges: 'IIT Bombay, IIM Bombay, COEP Pune, JSPM Tathawade Pune, IISER Pune',
    collegesList: [
      'IIT Bombay',
      'IIM Bombay',
      'COEP Pune',
      'JSPM Tathawade Pune',
      'IISER Pune',
    ],
    address: 'BCEC (Bhakti Center for Education and Culture), Tathawade, Near Hinjewadi, Pune, Maharashtra 411033',
    lat: 18.6186,
    lng: 73.7507,
    embedQuery: 'BCEC+Tathawade+Pune',
  },
  {
    id: 'pune-shivaji',
    name: 'Shivaji Nagar & COEP Student Hub',
    shortName: 'Shivaji Nagar',
    category: 'pune',
    area: 'Shivaji Nagar / FC Road / JM Road',
    colleges: 'COEP Technological Univ, Fergusson College, BMCC, Modern College',
    collegesList: ['COEP Pune', 'Fergusson College', 'BMCC', 'Modern College'],
    address: 'Near COEP Campus, Shivaji Nagar, Pune, Maharashtra',
    lat: 18.5314,
    lng: 73.8446,
    embedQuery: 'COEP+Shivaji+Nagar+Pune',
  },
  {
    id: 'pune-kothrud',
    name: 'Kothrud (MIT-WPU & Cummins)',
    shortName: 'Kothrud',
    category: 'pune',
    area: 'Kothrud / Karve Nagar / Paud Road',
    colleges: 'MIT-WPU, Cummins College of Engg, Marathwada Mitra Mandal (MMCOE)',
    collegesList: ['MIT-WPU', 'Cummins College of Engg', 'MMCOE Pune'],
    address: 'Near MIT Campus, Paud Road, Kothrud, Pune, Maharashtra',
    lat: 18.5074,
    lng: 73.8077,
    embedQuery: 'MIT+WPU+Paud+Road+Kothrud+Pune',
  },
  {
    id: 'pune-katraj',
    name: 'Katraj (PICT & VIIT Hub)',
    shortName: 'Katraj / PICT',
    category: 'pune',
    area: 'Katraj / Dhankawadi / Kondhwa',
    colleges: 'PICT, VIIT, VIT Kondhwa, Sinhagad Vadgaon',
    collegesList: ['PICT Pune', 'VIIT Pune', 'VIT Pune (Kondhwa)', 'Sinhagad Vadgaon'],
    address: 'Near PICT College, Dhankawadi, Pune, Maharashtra',
    lat: 18.4575,
    lng: 73.8508,
    embedQuery: 'PICT+Dhankawadi+Katraj+Pune',
  },
  {
    id: 'pune-viman',
    name: 'Viman Nagar (AIT & Symbiosis)',
    shortName: 'Viman Nagar',
    category: 'pune',
    area: 'Viman Nagar / Airport Road / Lohegaon',
    colleges: 'AIT Pune, Symbiosis International, DY Patil Lohegaon, Dhole Patil',
    collegesList: ['AIT Pune', 'Symbiosis International', 'DY Patil Lohegaon Pune', 'Dhole Patil'],
    address: 'Near Pune International Airport, Viman Nagar, Pune, Maharashtra',
    lat: 18.5679,
    lng: 73.9143,
    embedQuery: 'Viman+Nagar+Pune+Maharashtra',
  },
];

export const INDIA_CENTRES: CentreLocation[] = [
  {
    id: 'india-abids',
    name: 'ISKCON Abids Hyderabad',
    shortName: 'Abids Hyderabad',
    category: 'india',
    area: 'Abids, Hyderabad, Telangana (18 Colleges)',
    colleges: 'IIT Hyderabad, IIIT Hyderabad, BITS Hyderabad, CBIT, MGIT, Vasavi, MLR, CMR, VNR, MVSR, TKR, Guru Nanak, HCU, Osmania Medical, Srinidhi, Anurag, Keshav Memorial, Sri Indu',
    collegesList: [
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
    address: 'Sri Sri Radha Madanmohan Mandir, Nampally Station Road, Abids, Hyderabad, Telangana 500001',
    lat: 17.3916,
    lng: 78.4735,
    isHQ: true,
    embedQuery: 'ISKCON+Abids+Hyderabad+Telangana',
  },
  {
    id: 'india-juhu',
    name: 'ISKCON Juhu',
    shortName: 'Juhu Mumbai',
    category: 'india',
    area: 'Juhu, Mumbai, Maharashtra (14 Colleges)',
    colleges: 'IIT Bombay, NIT Surat, NIT Jaipur, NIT Raipur, IIT Bhilai, IIT Gandhinagar, NIT Warangal, NIT Andhra Pradesh, Sanjivani Kopargaon, Jalgaon, Avasari, SPC Mumbai, Chikhali, CHOICE Wadala',
    collegesList: [
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
    address: 'Sri Sri Radha Rasabihari Temple, Hare Krishna Land, Juhu, Mumbai, Maharashtra 400049',
    lat: 19.1075,
    lng: 72.8263,
    isHQ: true,
    embedQuery: 'ISKCON+Juhu+Mumbai',
  },
  {
    id: 'india-icc-blr',
    name: 'ICC Bengaluru',
    shortName: 'ICC Bengaluru',
    category: 'india',
    area: 'Bengaluru, Karnataka (8 Colleges)',
    colleges: 'NIT Surathkal, Manipal University, BMS College, Dayananda Sagar, RNSIT, IIM Bengaluru, BNMIT, PDA Kalaburagi',
    collegesList: [
      'NIT Surathkal, Karnataka',
      'Manipal University',
      'BMS College, Bengaluru',
      'Dayananda Sagar Institution, Bengaluru',
      'RNSIT, Bengaluru',
      'IIM Bengaluru',
      'BNMIT Bengaluru',
      'PDA, Kalaburagi',
    ],
    address: 'ISKCON Cultural Centre (ICC), Bengaluru, Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    embedQuery: 'ISKCON+Bengaluru+Karnataka',
  },
  {
    id: 'india-sjm-blr',
    name: 'ISKCON Sheshadaripuram, Bangalore (SJM Bangalore)',
    shortName: 'SJM Bangalore',
    category: 'india',
    area: 'Sheshadripuram, Bengaluru, Karnataka (8 Colleges)',
    colleges: 'IISc Bengaluru, PES University, RV College of Engineering, M.S. Ramaiah IT, IIIT Bangalore, Bangalore Medical College, SJCoE Mysore, Corporate preaching',
    collegesList: [
      'Indian Institute of Science, Bengaluru',
      'PES University Banshankari & E-city Campus, Bengaluru',
      'RV College of Engineering, Bengaluru',
      'M.S. Ramaihah IT, Bengaluru',
      'IIIT Bangalore',
      'Bangalore Medical College',
      'SJCoE Mysore',
      'Corporate preaching in various areas.',
    ],
    address: 'Sri Jagannath Mandir (SJM), Sheshadripuram, Bengaluru, Karnataka 560020',
    lat: 12.993,
    lng: 77.576,
    embedQuery: 'ISKCON+Seshadripuram+Bengaluru',
  },
  {
    id: 'india-kanpur',
    name: 'ISKCON Kanpur',
    shortName: 'Kanpur',
    category: 'india',
    area: 'Kanpur & Central UP, Uttar Pradesh (8 Colleges)',
    colleges: 'HBTU Kanpur, CSJM Kanpur, AITH Kanpur, KNIT Sultanpur, IET Lucknow, IIIT Lucknow, BIET Jhansi, MMM Gorakhpur',
    collegesList: [
      'HBTU Kanpur',
      'CSJM Kanpur',
      'AITH Kanpur',
      'KNIT Sultanpur',
      'IET Lucknow',
      'IIIT Lucknow',
      'BIET Jhansi',
      'MMM Gorakhpur',
    ],
    address: 'Sri Sri Radha Madhav Mandir, Mainavati Marg, Bithoor Road, Kanpur, Uttar Pradesh 208017',
    lat: 26.4499,
    lng: 80.3319,
    embedQuery: 'ISKCON+Kanpur+Mainavati+Marg',
  },
  {
    id: 'india-kolkata',
    name: 'ISKCON Newtown, Kolkata',
    shortName: 'Newtown Kolkata',
    category: 'india',
    area: 'Newtown, Kolkata, West Bengal (7 Colleges)',
    colleges: 'IIT Kharagpur, NIT Jamshedpur, IIEST Shibpur, Jadavpur University, MERI, Heritage Institute of Technology, IEM',
    collegesList: [
      'IIT Kharagpur',
      'NIT Jamshedpur',
      'IIEST Shibpur',
      'Jadavpur University',
      'MERI',
      'Heritage Institute of Technology',
      'IEM (Institute of Engineering & Management)',
    ],
    address: 'ISKCON Temple, Action Area 1, Newtown, Kolkata, West Bengal 700156',
    lat: 22.5867,
    lng: 88.4754,
    embedQuery: 'ISKCON+Newtown+Kolkata',
  },
  {
    id: 'india-warangal',
    name: 'ISKCON Warangal',
    shortName: 'Warangal',
    category: 'india',
    area: 'Warangal, Telangana (6 Colleges)',
    colleges: 'NIT Warangal, KITS Warangal, GRIET College Hyderabad, VNR College Hyderabad, JNTU Hyderabad, Acharya Nagarjuna University',
    collegesList: [
      'NIT Warangal',
      'KITS Warangal',
      'GRIET College Hyderabad',
      'VNR College Hyderabad',
      'JNTU Hyderabad',
      'Acarya Nagarjuna University, Pedakakani',
    ],
    address: 'ISKCON Temple, Mulugu Road, Warangal, Telangana 506007',
    lat: 17.9689,
    lng: 79.5941,
    embedQuery: 'ISKCON+Warangal+Telangana',
  },
  {
    id: 'india-prayagraj',
    name: 'ISKCON Prayagraj',
    shortName: 'Prayagraj',
    category: 'india',
    area: 'Prayagraj (Allahabad), Uttar Pradesh (5 Colleges)',
    colleges: 'MNNIT Prayagraj, IIIT Prayagraj, Allahabad University, Shambhunath Institute, IERT Prayagraj',
    collegesList: [
      'Motilal Nehru National Institute of Technology, Prayagraj',
      'Indian Institute of Information Technology, Prayagraj',
      'Allahabad University, Prayagraj',
      'Shambhunath Institute of Engineering and Technology, Prayagraj',
      'Institute of Engineering and Rural Technology, Prayagraj',
    ],
    address: 'ISKCON Temple, Kydganj / Baluaghat, Prayagraj, Uttar Pradesh 211003',
    lat: 25.4358,
    lng: 81.8463,
    embedQuery: 'ISKCON+Prayagraj+Allahabad',
  },
  {
    id: 'india-varanasi',
    name: 'ISKCON Varanasi',
    shortName: 'Varanasi',
    category: 'india',
    area: 'Varanasi, Uttar Pradesh (4 Colleges)',
    colleges: 'IIT BHU, BHU University, IMS BHU, Mahatma Gandhi Kashi Vidyapith',
    collegesList: [
      'IIT BHU (Varanasi)',
      'BHU University (Varanasi)',
      'Institute of Medical Sciences BHU (Varanasi)',
      'Mahatma Gandhi Kashi Vidya Pitha (Varanasi)',
    ],
    address: 'ISKCON Varanasi, Bhelupur / Lanka, Varanasi, Uttar Pradesh 221005',
    lat: 25.3176,
    lng: 82.9739,
    embedQuery: 'ISKCON+Varanasi+Uttar+Pradesh',
  },
  {
    id: 'india-thane',
    name: 'ISKCON Thane',
    shortName: 'Thane',
    category: 'india',
    area: 'Thane & Marathwada Network, Maharashtra (4 Colleges)',
    colleges: 'SGGSIE&T Nanded, MIT Sambhajinagar, MIMSR Medical Latur, Bidwe College Latur',
    collegesList: [
      'SGGSIE&T, Nanded',
      'MIT, Sambhajinagar',
      'MIMSR Medical college, Latur',
      'Bidwe College, Latur',
    ],
    address: 'ISKCON Temple, Ghodbunder Road, Thane West, Maharashtra 400607',
    lat: 19.2183,
    lng: 72.9781,
    embedQuery: 'ISKCON+Thane+Ghodbunder+Road',
  },
  {
    id: 'india-vijayawada',
    name: 'ISKCON Vijayawada',
    shortName: 'Vijayawada',
    category: 'india',
    area: 'Vijayawada & Amaravati, Andhra Pradesh (3 Colleges)',
    colleges: 'VIT-AP, KL University, AIIMS Mangalagiri',
    collegesList: [
      'VIT, AP',
      'KL University',
      'AIIMS',
    ],
    address: 'ISKCON Temple, Bundar Road / Undavalli, Vijayawada, Andhra Pradesh 520002',
    lat: 16.5062,
    lng: 80.648,
    embedQuery: 'ISKCON+Vijayawada+Andhra+Pradesh',
  },
  {
    id: 'india-dharwad',
    name: 'ISKCON Dharwad Hubballi',
    shortName: 'Dharwad Hubballi',
    category: 'india',
    area: 'Dharwad & Hubballi, Karnataka (3 Colleges)',
    colleges: 'IIT Dharwad, IIIT Dharwad, BVB Hubballi',
    collegesList: [
      'IIT Dharwad',
      'IIIT Dharwad',
      'BVB Hubballi',
    ],
    address: 'ISKCON Centre, Rayapur / Hubballi-Dharwad Bypass, Karnataka 580009',
    lat: 15.4589,
    lng: 75.0078,
    embedQuery: 'ISKCON+Dharwad+Hubballi',
  },
  {
    id: 'india-dhanbad',
    name: 'ISKCON Dhanbad',
    shortName: 'Dhanbad',
    category: 'india',
    area: 'Dhanbad, Jharkhand (2 Colleges)',
    colleges: 'IIT ISM Dhanbad, BIT Sindri',
    collegesList: [
      'IIT ISM Dhanbad',
      'BIT Sindri',
    ],
    address: 'ISKCON Centre, Near IIT ISM Campus, Dhanbad, Jharkhand 826004',
    lat: 23.7957,
    lng: 86.4304,
    embedQuery: 'ISKCON+Dhanbad+Jharkhand',
  },
  {
    id: 'india-trichy',
    name: 'ISKCON Trichy',
    shortName: 'Trichy',
    category: 'india',
    area: 'Tiruchirappalli, Tamil Nadu (NIT Trichy)',
    colleges: 'NIT Trichy',
    collegesList: [
      'NIT Trichy',
    ],
    address: 'ISKCON Trichy, Near National Institute of Technology, Thuvakudi, Tiruchirappalli, Tamil Nadu 620015',
    lat: 10.7905,
    lng: 78.7047,
    embedQuery: 'NIT+Trichy+Tiruchirappalli+Tamil+Nadu',
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Affiliated Colleges & Universities:
                  </span>
                  {selectedCentre?.collegesList && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {selectedCentre.collegesList.length} Colleges
                    </span>
                  )}
                </div>
                {selectedCentre?.collegesList && selectedCentre.collegesList.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {selectedCentre.collegesList.map((col, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 text-xs bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs"
                      >
                        <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 leading-snug">{col}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-semibold text-slate-900">{selectedCentre?.colleges}</p>
                )}
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

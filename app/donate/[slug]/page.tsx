'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
  Lock,
  HeartHandshake,
  Award,
  Heart,
  Users,
  Sparkles,
  BookOpen,
  Brain,
  Compass,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Gift,
  Home,
  Star,
  Check,
  TrendingUp,
  Info,
  Volume2,
  VolumeX,
  Mail,
  Phone,
  MapPin,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import Script from 'next/script';
import DriveImage from '@/components/activities/DriveImage';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const MOCK_MODE = false;
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const VIDEO_URL = 'https://ia903108.us.archive.org/15/items/current-youth-challenges_20261013/Current%20Youth%20Challenges.mp4';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// 6 Contribution Schemes
const DONATION_SCHEMES = [
  {
    id: 'hope-giver',
    name: 'Hope Giver',
    minAmount: 2100,
    range: '₹2,100 – ₹5,099',
    badge: 'Starter Sanga',
    accent: 'bg-amber-100 text-amber-900 border-amber-300',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report'
    ]
  },
  {
    id: 'youth-friend',
    name: 'Youth Friend',
    minAmount: 5100,
    range: '₹5,100 – ₹10,999',
    badge: 'Devotee Favorite',
    accent: 'bg-orange-100 text-orange-950 border-orange-300',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report',
      'Special Cultural Gifts from VOICE'
    ]
  },
  {
    id: 'youth-guardian',
    name: 'Youth Guardian',
    minAmount: 11000,
    range: '₹11,000 – ₹20,999',
    badge: 'Most Popular',
    featured: true,
    accent: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report',
      'Special Cultural Gifts from VOICE',
      'Special VOICE Annual Devotional Calendar'
    ]
  },
  {
    id: 'legacy-builder',
    name: 'Legacy Builder',
    minAmount: 21000,
    range: '₹21,000 – ₹50,999',
    badge: 'Empowerer',
    accent: 'bg-amber-100 text-amber-900 border-amber-300',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report',
      'Special Cultural Gifts from VOICE',
      'Special VOICE Annual Devotional Calendar',
      'Premium Spiritual Vedic Book Set'
    ]
  },
  {
    id: 'generation-shaper',
    name: 'Generation Shaper',
    minAmount: 51000,
    range: '₹51,000 – ₹99,999',
    badge: 'Visionary Leader',
    accent: 'bg-purple-100 text-purple-950 border-purple-300',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report',
      'Special Cultural Gifts from VOICE',
      'Special VOICE Annual Devotional Calendar',
      'Premium Spiritual Vedic Book Set',
      'Special Katha & Kirtan at your home (in Pune)'
    ]
  },
  {
    id: 'nation-builder',
    name: 'Nation Builder',
    minAmount: 100000,
    range: '₹1,00,000 & above',
    badge: 'Supreme Patron',
    accent: 'bg-rose-100 text-rose-950 border-rose-300',
    benefits: [
      'Sri Balaji Puja on a Special Day of your life',
      'Youth Welfare Services Annual Report',
      'Special Cultural Gifts from VOICE',
      'Special VOICE Annual Devotional Calendar',
      'Premium Spiritual Vedic Book Set',
      'Special Katha & Kirtan at your home (in Pune)',
      'Guest of Honor at Grand Annual Youth Festival'
    ]
  }
];

// Youth Crisis Stats (Research Backed)
const CRISIS_STATS = [
  {
    title: 'Mental Health Disorders',
    stat: '1 in 7 Adolescents',
    detail: 'Worldwide (aged 10–19) experience a severe, debilitating mental disorder that impairs life.',
    source: 'World Health Organization (WHO), 2025',
    driveId: '1BN6EuFXvhIQCazKkrlcPHcAJqZBdrwAw'
  },
  {
    title: 'Depression & Despair',
    stat: '1 in 7 Indian Youths',
    detail: 'Aged 15–24 frequently feel depressed, hopeless, or completely lose interest in all life activities.',
    source: 'UNICEF & Gallup Survey, 2021',
    driveId: '1YdQajt0G1dF7-qvPkjIjadN76RG11Uqb'
  },
  {
    title: 'Digital & Screen Addiction',
    stat: '27% Smartphone Addiction',
    detail: '17.4% severe social media addiction; 14.2% chronic internet compulsion robbing peace of mind.',
    source: 'International Meta-Analysis, 2022',
    driveId: '1ZMt0ylP0ovcHbno2-YUA_xJVBo4fFgL_'
  },
  {
    title: 'Online Bullying & Harassment',
    stat: '33% Female Youths',
    detail: 'Expressed profound trauma, fear, and mental anxiety triggered by relentless toxic online bullying.',
    source: 'UNICEF India – U-Report, 2024',
    driveId: '1r03AV8iTjhnLFZQ6h2cZXn8wLIr3vwjF'
  },
  {
    title: 'Substance & Drug Abuse',
    stat: '32.8% of Young People',
    detail: 'Reported dangerous substance or alcohol abuse across a comprehensive 15-state Indian survey.',
    source: 'Indian Research Study, 2024',
    driveId: '15GU_XNsGgmwuK_k96Zsg0nqllJhf0kNE'
  },
  {
    title: 'Alarming Suicide Rate',
    stat: '52,718 Suicides in India',
    detail: '3rd leading cause of death among youth (15–29) worldwide; 52,718 youth lives lost in India.',
    source: 'WHO, 2021 & Govt. of India, 2022',
    driveId: '18OCUa8ZG-c5N0QYgQpdcr01SNhXDBFHv'
  },
  {
    title: 'Youth Crime & Incarceration',
    stat: '27.5% of Prisoners',
    detail: 'Of all convicted inmates in Indian prisons are young people aged 18 to 30 trapped in criminal influence.',
    source: 'National Crime Records Bureau (NCRB), 2024',
    driveId: '129d3GAQs-Pe6ltEWvnNf_43eIcG9VQ7S'
  },
  {
    title: 'Childhood Abuse & Neglect',
    stat: '2 in 3 Physically Abused',
    detail: '53.2% sexually abused; 1 in 2 emotionally neglected during formative developmental years.',
    source: 'Ministry of Women & Child Dev, GoI',
    driveId: '1R6zp4TNtmo8NfOTp4fJEen9JSPpYEdcL'
  }
];

// Sacred Blooming Lotus Icon Component (Matching Lucide Line Geometry)
function LotusIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Central sacred lotus petal */}
      <path d="M12 3c-1.8 3.5-3 7.5-3 11.5 0 3.5 1.3 5.5 3 6.5 1.7-1 3-3 3-6.5 0-4-1.2-8-3-11.5z" />
      {/* Left blooming petal */}
      <path d="M9.5 14.5C7 10 4 10.5 2.5 13c1 4 4.5 6.5 8 7.5" />
      {/* Right blooming petal */}
      <path d="M14.5 14.5C17 10 20 10.5 21.5 13c-1 4-4.5 6.5-8 7.5" />
      {/* Sacred lotus base pool */}
      <path d="M5.5 21c2.5 1 10.5 1 13 0" />
    </svg>
  );
}

// Royal Gold & Warm Parchment Editorial Crisis Card (Direct View, Full Bleed Photo, No Flip Needed)
function CrisisCard({
  item,
  index,
  onCardClick
}: {
  item: typeof CRISIS_STATS[0];
  index: number;
  onCardClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick?.();
        }
      }}
      className="group relative flex flex-col justify-between rounded-3xl bg-white border border-amber-300/80 hover:border-amber-500 shadow-md hover:shadow-[0_20px_40px_-12px_rgba(217,119,6,0.25)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden ring-1 ring-amber-400/10 h-full cursor-pointer"
    >
      {/* Top Foil Gradient Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 z-20" />

      {/* Full-bleed Photo Container */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-amber-950/5">
        <DriveImage
          driveId={item.driveId}
          alt={item.title}
          size={700}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          showZoomIcon={false}
        />
        {/* Deep Black Shading Scrim across bottom of image for 100% text legibility */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-14 pb-3 px-3.5 z-10 pointer-events-none" />

        {/* Crisis Title over Deep Black Scrim */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 z-20">
          <h4 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {item.title}
          </h4>
        </div>
      </div>

      {/* Card Content Body (Golden Parchment Silk) */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#ffffff] via-[#fffdfa] to-[#fff9ee]">
        <div>
          {/* Big Stat Figure in Regal Vedic Maroon */}
          <p className="text-2xl sm:text-[26px] font-black font-serif text-[#781f08] leading-tight tracking-tight">
            {item.stat}
          </p>

          {/* Research Context / Impact Detail */}
          <p className="mt-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
            {item.detail}
          </p>
        </div>

        {/* Verified Citation Footer */}
        <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-950/80 truncate">
              {item.source}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100/90 group-hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-colors">
            <span>Contribute</span>
            <ArrowRight className="w-2.5 h-2.5 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// The 6 Pillars of Complete Transformation Data with Google Drive Photos
const SIX_PILLARS = [
  {
    num: '01',
    title: 'Character Building',
    tag: 'Moral Integrity & Ethics',
    desc: 'Students develop strong ethical values, integrity, and emotional stability to make conscious, principled choices in life.',
    driveId: '1CA-EMYBnudau3G4f0dGFxMe0yaV9qUnR'
  },
  {
    num: '02',
    title: 'Healthy Habits & Lifestyle',
    tag: 'Physical Vigor & Calm',
    desc: 'Physical vigor and mental calm through regular yoga, japa meditation, wholesome sattvic food, and early-morning discipline.',
    driveId: '1481IwYe0VuWbLLw3_0r_Ue6uHcdNxXnh'
  },
  {
    num: '03',
    title: 'Academic Excellence',
    tag: 'Focus & Intellect',
    desc: 'Comprehensive study counseling, exam strategy, concentration enhancement, and peer learning circles.',
    driveId: '163Dk1SGw9CbvBFaY5YY7BtoOZOV_N0Q-'
  },
  {
    num: '04',
    title: 'Public Speaking & Teamwork',
    tag: 'Leadership & Eloquence',
    desc: 'Overcoming stage fright, articulating visionary ideas clearly, collaborating harmoniously, and taking up responsibility.',
    driveId: '1hZJSjXlFpQef5y-RZRsgwDysWQhSzaX7'
  },
  {
    num: '05',
    title: 'Life Skills & Culture',
    tag: 'Vedic Heritage & Arts',
    desc: 'Music, traditional instruments (mridanga, kartals), culinary skills, and appreciation of profound Vedic heritage.',
    driveId: '1kUEpTDVLdek1x9uu9zEkdGon1KP1loGm'
  },
  {
    num: '06',
    title: 'Mentorship & Community',
    tag: 'Counseling & Brotherhood',
    desc: 'Caring one-on-one counselor support, emotional shelter, and a positive brotherhood that protects from negative peer pressures.',
    driveId: '1q0JfhU2f8GUqNSz8c90wv2TkCStWC-gB'
  }
];

function PillarCard({
  item,
  index,
  onCardClick
}: {
  item: typeof SIX_PILLARS[0];
  index: number;
  onCardClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick?.();
        }
      }}
      className="group relative flex flex-col justify-between rounded-3xl bg-white border-2 border-amber-200/90 hover:border-amber-400 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full ring-1 ring-amber-400/10 cursor-pointer"
    >
      {/* Top Foil Stripe */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 z-20" />

      {/* Photo Container */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-amber-950/5">
        <DriveImage
          driveId={item.driveId}
          alt={item.title}
          size={700}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          showZoomIcon={false}
        />
        {/* Soft Dark Vignette at bottom of photo */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-10 pb-2.5 px-3.5 z-10 pointer-events-none" />

        {/* Pillar Tag at Bottom of Photo */}
        <div className="absolute bottom-2 left-3.5 right-3.5 z-20">
          <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider drop-shadow-md">
            {item.tag}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-[#fffaf0]">
        <div>
          <h4 className="text-base sm:text-lg font-black text-slate-900 font-serif leading-tight">
            {item.title}
          </h4>
          <p className="mt-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
            {item.desc}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-900">
          <span className="flex items-center gap-1">
            <span className="text-xs">🪔</span>
            <span>VOICE Core Pillar</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase tracking-wider group-hover:text-amber-900 transition-colors">
            <span>Sponsor</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DonationPage() {
  const { slug } = useParams();
  const formRef = useRef<HTMLDivElement>(null);
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const crisisScrollRef = useRef<HTMLDivElement | null>(null);
  const pillarsScrollRef = useRef<HTMLDivElement | null>(null);
  const schemesScrollRef = useRef<HTMLDivElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  const hasUserScrolledSchemesRef = useRef(false);

  // Center the most popular / most chosen card (Youth Guardian) by default on mobile
  const centerDefaultCard = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (schemesScrollRef.current) {
      const container = schemesScrollRef.current;
      const targetCard = (container.querySelector('#scheme-card-youth-guardian') ||
        container.querySelector('[data-featured="true"]')) as HTMLElement | null;
      if (targetCard) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = targetCard.getBoundingClientRect();
        const scrollPos = container.scrollLeft + (cardRect.left - containerRect.left) - (container.clientWidth - targetCard.clientWidth) / 2;
        container.scrollTo({ left: Math.max(0, scrollPos), behavior });
      }
    }
  }, []);

  const scrollToSchemes = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        centerDefaultCard('smooth');
      }, 250);
    }
  };

  const scrollToPaymentForm = () => {
    if (paymentFormRef.current) {
      paymentFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollCrisis = (direction: 'left' | 'right') => {
    if (!crisisScrollRef.current) return;
    const scrollAmount = crisisScrollRef.current.clientWidth * 0.85;
    crisisScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollPillars = (direction: 'left' | 'right') => {
    if (!pillarsScrollRef.current) return;
    const scrollAmount = pillarsScrollRef.current.clientWidth * 0.85;
    pillarsScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollSchemesCarousel = (direction: 'left' | 'right') => {
    if (!schemesScrollRef.current) return;
    hasUserScrolledSchemesRef.current = true;
    const scrollAmount = schemesScrollRef.current.clientWidth * 0.85;
    schemesScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // On mobile mount, center the most popular / most chosen card (Youth Guardian) by default
  useEffect(() => {
    // 1. Center at various mount milestones
    centerDefaultCard('auto');
    const t1 = setTimeout(() => centerDefaultCard('auto'), 80);
    const t2 = setTimeout(() => centerDefaultCard('auto'), 250);
    const t3 = setTimeout(() => centerDefaultCard('auto'), 600);

    // 2. Track manual user interaction
    const container = schemesScrollRef.current;
    const onUserTouch = () => {
      hasUserScrolledSchemesRef.current = true;
    };
    if (container) {
      container.addEventListener('touchstart', onUserTouch, { passive: true });
      container.addEventListener('mousedown', onUserTouch, { passive: true });
    }

    // 3. When the schemes section enters viewport, ensure Youth Guardian is centered if user hasn't scrolled
    let observer: IntersectionObserver | null = null;
    if (container && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasUserScrolledSchemesRef.current) {
              centerDefaultCard('auto');
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (container) {
        container.removeEventListener('touchstart', onUserTouch);
        container.removeEventListener('mousedown', onUserTouch);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [centerDefaultCard]);

  // Show floating donation button after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowFloatingBtn(window.scrollY > 320);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Guarantee muted autoplay on mount without needing initial user click
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => { });
  }, []);

  // Sync mute state when toggled via button
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted) {
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => { });
      });
    } else {
      video.play().catch(() => { });
    }
  }, [isMuted]);

  const [targetUser, setTargetUser] = useState<any>(null);
  const [activeGateway, setActiveGateway] = useState<string>('razorpay');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('youth-guardian');
  const [showFullTableModal, setShowFullTableModal] = useState(false);

  // Tracking on-behalf devotee (silently stored for database attribution)
  const [onBehalfOfId, setOnBehalfOfId] = useState<string | null>(null);
  const [onBehalfOfName, setOnBehalfOfName] = useState<string | null>(null);
  const [paymentForParam, setPaymentForParam] = useState<string>('Youth Empowerment & Gurukul Development');

  const [formData, setFormData] = useState({
    amount: '11000',
    donorName: '',
    donorEmail: '',
    donorMobile: '',
    donorPan: '',
    donorAddress: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, name, email, phone, profile_image, donation_slug, parent_center, other_parent_center, parent_temple, other_parent_temple, current_center, other_center, current_temple, other_temple, center, ashram, selected_behalf_id, selected_behalf_name')
          .eq('donation_slug', slug)
          .single();

        if (fetchError || !data) {
          setError('This donation link is invalid or has expired.');
        } else {
          // Auto-load on-behalf devotee from user profile in database
          if (data.selected_behalf_id) {
            setOnBehalfOfId(data.selected_behalf_id);
            if (data.selected_behalf_name) {
              setOnBehalfOfName(data.selected_behalf_name);
            } else if (supabase) {
              supabase.from('donation_behalf_devotees').select('name').eq('id', data.selected_behalf_id).maybeSingle().then(({ data: bData }: any) => {
                if (bData?.name) setOnBehalfOfName(bData.name);
              });
            }
          }

          let resolvedParentCenter = 'None';
          if (data.parent_center && data.parent_center !== 'None' && data.parent_center !== 'General') {
            resolvedParentCenter = data.parent_center === 'Other'
              ? (data.other_parent_center ? data.other_parent_center.trim() : 'Other')
              : data.parent_center.trim();
          }

          let resolvedParentTemple = 'None';
          if (data.parent_temple && data.parent_temple !== 'None' && data.parent_temple !== 'General') {
            resolvedParentTemple = data.parent_temple === 'Other'
              ? (data.other_parent_temple ? data.other_parent_temple.trim() : 'Other')
              : data.parent_temple.trim();
          }

          let resolvedCurrentCenter = 'None';
          if (data.current_center && data.current_center !== 'None' && data.current_center !== 'General') {
            resolvedCurrentCenter = data.current_center === 'Other'
              ? (data.other_center ? data.other_center.trim() : 'Other')
              : data.current_center.trim();
          } else if (data.center && data.center !== 'None') {
            resolvedCurrentCenter = data.center.trim();
          }

          let resolvedCurrentTemple = 'None';
          if (data.current_temple && data.current_temple !== 'None' && data.current_temple !== 'General') {
            resolvedCurrentTemple = data.current_temple === 'Other'
              ? (data.other_temple ? data.other_temple.trim() : 'Other')
              : data.current_temple.trim();
          }

          setTargetUser({
            ...data,
            resolvedParentCenter,
            resolvedParentTemple,
            resolvedCurrentCenter,
            resolvedCurrentTemple,
            resolvedCenter: resolvedParentCenter,
            resolvedTemple: resolvedParentTemple,
            ashram: data.ashram || 'N/A'
          });

          const { data: settings } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('id', 'active_payment_gateway')
            .single();

          if (settings?.value) {
            const normalized = String(settings.value).replace(/^["']|["']$/g, '');
            setActiveGateway(normalized);
          }
        }
      } catch (err) {
        setError('Something went wrong loading donation details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const behalfParam = params.get('behalf') || params.get('on_behalf_of');
      const behalfNameParam = params.get('behalf_name');
      if (behalfParam) {
        setOnBehalfOfId(behalfParam);
        if (behalfNameParam) {
          setOnBehalfOfName(decodeURIComponent(behalfNameParam));
        } else if (supabase) {
          supabase.from('donation_behalf_devotees').select('name').eq('id', behalfParam).maybeSingle().then(({ data }: any) => {
            if (data?.name) setOnBehalfOfName(data.name);
          });
        }
      }
      const camp = params.get('camp') || params.get('for') || params.get('activity');
      if (camp) {
        setPaymentForParam(camp);
      }
      const amountParam = params.get('amount');
      if (amountParam && !isNaN(Number(amountParam))) {
        setFormData(prev => ({ ...prev, amount: amountParam }));
      }
      const mode = params.get('mode');
      const msg = params.get('message');

      if (mode === 'success') {
        setIsSuccess(true);
      } else if (mode === 'error') {
        setError(msg === 'payment_failed' ? 'Your payment failed or was cancelled.' : 'A security error occurred processing your payment.');
      }
    }
  }, [slug]);

  const selectScheme = (scheme: typeof DONATION_SCHEMES[0]) => {
    setSelectedSchemeId(scheme.id);
    setFormData(prev => ({ ...prev, amount: String(scheme.minAmount) }));
    if (paymentFormRef.current) {
      paymentFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePayment = async () => {
    if (!targetUser) return;
    setIsProcessing(true);
    setError('');

    const websiteHost = typeof window !== 'undefined' ? window.location.host : 'voicegurukul.com';
    const websiteUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSuccess(true);
      } else if (activeGateway === 'razorpay') {
        if (!window.Razorpay) {
          throw new Error('Payment gateway failed to load. Please refresh.');
        }

        const orderRes = await fetch('/api/donations/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            targetUserId: targetUser.id,
            collectorName: targetUser.name,
            collectorEmail: targetUser.email,
            collectorMobile: targetUser.phone,
            collectorSlug: targetUser?.donation_slug || (Array.isArray(slug) ? slug[0] : slug) || '',
            parentCenter: targetUser.resolvedParentCenter,
            parentTemple: targetUser.resolvedParentTemple,
            currentCenter: targetUser.resolvedCurrentCenter,
            currentTemple: targetUser.resolvedCurrentTemple,
            center: targetUser.resolvedCenter,
            temple: targetUser.resolvedTemple,
            ashram: targetUser.ashram,
            website: 'voicegurukul.com',
            websiteUrl: websiteUrl,
            paymentFor: (paymentForParam && paymentForParam.toLowerCase().includes('camp')) ? paymentForParam : 'Donation',
            onBehalfOfId,
            onBehalfOfName
          })
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize secure payment order.');
        }

        const keyToUse = orderData.keyId || RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!keyToUse) {
          throw new Error('Payment configuration missing (Key ID). Please contact admin.');
        }

        const isCampParam = Boolean(paymentForParam && paymentForParam.toLowerCase().includes('camp'));
        const collectorDisplayName = targetUser.name || 'Voice Gurukul';
        const donationDescription = isCampParam ? `${paymentForParam} via ${collectorDisplayName}` : `donation via ${collectorDisplayName}`;

        const options = {
          key: keyToUse,
          amount: orderData.amount,
          currency: "INR",
          name: "Voice Gurukul",
          description: donationDescription,
          image: targetUser.profile_image || "",
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              setIsProcessing(true);
              const verifyRes = await fetch('/api/donations/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });
              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                throw new Error("Payment verification failed.");
              }

              setIsSuccess(true);
            } catch (err: any) {
              setError(err.message || "An error occurred verifying your payment.");
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: formData.donorName,
            email: formData.donorEmail,
            contact: formData.donorMobile,
          },
          notes: (() => {
            if (isCampParam) {
              const campNotes: Record<string, string> = {
                payment_for: String(paymentForParam).substring(0, 50),
                website: 'voicegurukul.com',
                donor_name: String(formData.donorName || "").substring(0, 50),
                collector_parent_center: String(targetUser.resolvedParentCenter || "None").substring(0, 50),
              };
              if (formData.donorAddress && formData.donorAddress.trim() && formData.donorAddress.trim().toUpperCase() !== 'N/A') {
                campNotes.donor_address = String(formData.donorAddress.trim()).substring(0, 100);
              }
              if (formData.donorPan && formData.donorPan.trim() && formData.donorPan.trim().toUpperCase() !== 'N/A') {
                campNotes.donor_pan = String(formData.donorPan.trim()).substring(0, 20);
              }
              return campNotes;
            }

            const safePan = formData.donorPan && formData.donorPan.trim() && formData.donorPan.trim().toUpperCase() !== 'N/A'
              ? formData.donorPan.trim().substring(0, 20)
              : '';
            const safeAddress = formData.donorAddress && formData.donorAddress.trim() && formData.donorAddress.trim().toUpperCase() !== 'N/A'
              ? formData.donorAddress.trim().substring(0, 100)
              : '';

            const notesMap: Record<string, string> = {
              "Payment for": "Donation",
              "website": "voicegurukul.com",
              "Cost center": "Gurukul VOICE",
              "donar name": String(formData.donorName || "").substring(0, 50),
              "donar pan": safePan,
              "donar address": safeAddress,
              "description": donationDescription.substring(0, 100),
              // Compatibility aliases
              "payment_for": "Donation",
              "cost_center": "Gurukul VOICE",
              "donor_name": String(formData.donorName || "").substring(0, 50),
              "donor_pan": safePan,
              "donor_address": safeAddress,
              "discription": donationDescription.substring(0, 100)
            };
            return notesMap;
          })(),
          theme: {
            color: "#d97706", // warm amber-600 gold
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (activeGateway === 'easebuzz') {
        const orderRes = await fetch('/api/donations/easebuzz/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            targetUserId: targetUser.id,
            collectorName: targetUser.name,
            collectorEmail: targetUser.email,
            collectorMobile: targetUser.phone,
            collectorSlug: slug,
            slug,
            parentCenter: targetUser.resolvedParentCenter,
            parentTemple: targetUser.resolvedParentTemple,
            currentCenter: targetUser.resolvedCurrentCenter,
            currentTemple: targetUser.resolvedCurrentTemple,
            center: targetUser.resolvedCenter,
            temple: targetUser.resolvedTemple,
            ashram: targetUser.ashram,
            website: 'voicegurukul.com',
            websiteUrl: websiteUrl,
            paymentFor: (paymentForParam && paymentForParam.toLowerCase().includes('camp')) ? paymentForParam : 'Donation',
            onBehalfOfId,
            onBehalfOfName
          })
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize Easebuzz order.');
        }

        window.location.href = orderData.paymentUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
      setIsProcessing(false);
    }
  };

  const isFormValid = Boolean(
    formData.amount &&
    parseFloat(formData.amount) > 0 &&
    formData.donorName.trim() &&
    formData.donorEmail.trim() &&
    formData.donorMobile.trim()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff9ee] flex flex-col items-center justify-center text-amber-950">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin" />
          <span className="text-2xl absolute inset-0 m-auto flex items-center justify-center animate-pulse">🪔</span>
        </div>
        <p className="mt-4 text-amber-900 font-bold text-sm tracking-wide">Lighting the auspicious lamp...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf7] text-slate-800 font-sans selection:bg-amber-400 selection:text-amber-950 relative overflow-x-hidden">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Radiant Golden Diwali Aura Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-gradient-to-b from-amber-300/30 via-yellow-200/20 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] left-0 w-[550px] h-[550px] bg-orange-200/25 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[1800px] right-0 w-[550px] h-[550px] bg-yellow-200/30 blur-[140px] pointer-events-none -z-10" />

      {/* Festive Golden Navigation Header */}
      <header className="border-b border-amber-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 flex items-center justify-center text-amber-950 shadow-md shadow-amber-500/20 border border-amber-300">
              <span className="text-xl">🪔</span>
            </div>
            <div>
              <span className="font-black text-base sm:text-xl tracking-tight text-[#4a1c0d] block leading-tight font-serif">
                VOICE <span className="text-amber-600">Gurukul</span>
              </span>
              <span className="text-[10px] text-amber-800 font-bold tracking-wider uppercase block">
                Nurturing Youth Since 1995
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Auspicious Diwali Campaign
            </span>
            <button
              onClick={() => {
                if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all border border-amber-300"
            >
              Contribute Now
            </button>
          </div>
        </div>
      </header>

      {/* ================= SECTION 1: HERO (LIGHT OVER DARKNESS / COMPACT LUXURY SILK CANVAS) ================= */}
      <section className="relative pt-2 sm:pt-4 pb-8 sm:pb-10 px-3 sm:px-6 max-w-7xl mx-auto">
        {/* Unified Luxury Silk Canvas Container (Compact & Fully Viewport-Optimized for 13" & 14" Laptops) */}
        <div className="relative rounded-2xl sm:rounded-3xl lg:rounded-[32px] bg-gradient-to-br from-[#ffffff] via-[#fffbf3] to-[#fff5e3] border-2 border-amber-300 shadow-[0_20px_50px_-15px_rgba(180,83,9,0.15)] p-4 sm:p-6 lg:p-6 xl:p-8 overflow-hidden ring-1 ring-amber-400/20">
          {/* Top Foil Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 z-20" />

          {/* Warm Ambient Diwali Light Spheres */}
          <div className="absolute -top-28 -left-28 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-orange-300/18 blur-3xl pointer-events-none" />

          {/* 2-Column Split: Mission Narrative & Sacred Campaign Artwork */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Mission Narrative & Action (Compact, Fully Centered) */}
            <div className="lg:col-span-7 text-center flex flex-col items-center justify-center">
              {/* Auspicious Diwali Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 border border-amber-300/90 text-amber-950 text-[10px] sm:text-xs font-black tracking-wide uppercase mb-2 sm:mb-2.5 shadow-xs mx-auto">
                <span className="text-xs">🪔</span>
                <span>Light Over Darkness • Diwali Youth Awakening</span>
              </div>

              {/* Elegant Italic Intro matching Poster */}
              <div className="flex items-center justify-center gap-2.5 mb-2">
                <span className="w-8 sm:w-12 h-[1px] bg-amber-400/80 inline-block" />
                <span className="text-base sm:text-lg lg:text-xl font-serif italic text-amber-900 font-bold tracking-wide">
                  Your Contribution can
                </span>
                <span className="w-8 sm:w-12 h-[1px] bg-amber-400/80 inline-block" />
              </div>

              {/* Majestic 3-Line Slogan in Regal Vedic Maroon (Compact Clamped Scale) */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[28px] xl:text-[34px] 2xl:text-[40px] font-black text-[#701605] tracking-tight leading-[1.08] font-serif text-center">
                <span className="block">Transform Lives</span>
                <span className="block mt-0.5">Build Leaders</span>
                <span className="block mt-0.5">Shape the Future</span>
              </h1>

              {/* Subtitle Description with Quotes & Compact Rhythm */}
              <p className="mt-2 sm:mt-2.5 text-xs text-slate-700/90 leading-relaxed max-w-md mx-auto font-normal italic text-center px-1">
                &ldquo;While millions of young souls are trapped in the darkness of screen addiction, depression, and aimlessness, VOICE Gurukul illuminates their hearts with character and purpose based on timeless Bhagavad Gita wisdom.&rdquo;
              </p>

              {/* Primary & Secondary Action Buttons (Full-Width on Mobile for Easy Thumb Tap) */}
              <div className="mt-3.5 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all border border-amber-300 cursor-pointer"
                >
                  <span className="text-base sm:text-lg">🪔</span>
                  <span>Light a Life — Contribute Now</span>
                </button>
                <a
                  href="#silent-crisis"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-amber-900 hover:text-amber-950 px-4 py-2.5 sm:py-3 rounded-xl border border-amber-300 bg-white/90 hover:bg-white shadow-xs transition-all"
                >
                  <span>See Youth Crisis</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                </a>
              </div>

              {/* Mobile Trust Badges (Clean Capsule Pills - No Truncation/No Ellipsis!) */}
              <div className="mt-3.5 pt-3 border-t border-amber-200/70 flex sm:hidden items-center justify-center gap-1.5 flex-wrap w-full">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-amber-300 text-[10px] font-bold text-[#44180b] shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>80G Tax Benefits</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-amber-300 text-[10px] font-bold text-[#44180b] shadow-2xs">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>30+ Yrs Since 1995</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-amber-300 text-[10px] font-bold text-[#44180b] shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>50 Lakh+ Youths</span>
                </span>
              </div>

              {/* Tablet & Desktop Trust Cards (Structured 3-Card Row) */}
              <div className="mt-4 pt-3.5 border-t border-amber-200/70 hidden sm:grid sm:grid-cols-3 gap-2 w-full max-w-lg mx-auto">
                <div className="p-2 sm:p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-black text-[#44180b] leading-tight truncate">Tax Benefits</p>
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold leading-tight mt-0.5 truncate">Under Sec 80G</p>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-black text-[#44180b] leading-tight truncate">30+ Years Reach</p>
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold leading-tight mt-0.5 truncate">Since 1995</p>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-black text-[#44180b] leading-tight truncate">50 Lakh+ Lives</p>
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold leading-tight mt-0.5 truncate">120+ Colleges</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Full-Bleed Artwork (Responsive for Mobile & Laptops) */}
            <div className="lg:col-span-5 relative w-full max-w-xs sm:max-w-sm lg:max-w-none mx-auto flex items-center justify-center mt-2 lg:mt-0">
              {/* Outer Golden Aura Glow */}
              <div className="absolute -inset-2 sm:-inset-2.5 bg-gradient-to-tr from-amber-400/30 via-yellow-300/35 to-orange-400/25 blur-xl rounded-2xl -z-10" />

              {/* Artwork Frame */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 shadow-xl shadow-amber-950/15 bg-amber-950 group w-full">
                <DriveImage
                  driveId="17v9u580mmpA701yRDGPImdgpdAkgzEGF"
                  alt="Your Contribution can Transform Lives - VOICE Gurukul"
                  size={1000}
                  className="w-full h-auto block max-h-[320px] sm:max-h-[380px] lg:max-h-[380px] xl:max-h-[420px]"
                  imgClassName="w-full h-auto block max-h-[320px] sm:max-h-[380px] lg:max-h-[380px] xl:max-h-[420px] object-cover group-hover:scale-[1.015] transition-transform duration-700"
                  showZoomIcon={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Real Youth Crisis & Transformation Video Showcase */}
        <div className="mt-10 sm:mt-16 max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-yellow-100 border border-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3 h-3 text-red-600 shrink-0" />
            <span className="sm:hidden">Watch The Reality</span>
            <span className="hidden sm:inline">Watch The Reality • How VOICE Transforms Lives</span>
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
          </div>

          <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-[#44180b] tracking-tight leading-snug font-serif px-2 sm:px-0">
            Overcoming Physical, Mental &amp; Emotional Crises
            <span className="block mt-1 sm:mt-2 text-base sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
              How VOICE Mentors &amp; Transforms Youth
            </span>
          </h2>

          <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal px-3 sm:px-0">
            Today&apos;s youth face immense academic pressure, depression, screen addiction, and emotional distress.
            Watch how VOICE provides empathetic 1-on-1 mentorship, de-addiction, and holistic character training.
          </p>

          <div className="relative rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 bg-gradient-to-b from-white via-amber-50/50 to-amber-100/40 border border-amber-300/90 shadow-xl shadow-amber-900/10 max-w-3xl mx-auto group ring-1 ring-amber-400/20">
            <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-inner">
              <video
                ref={videoRef}
                controls
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
              >
                <source src={VIDEO_URL} type="video/mp4" />
                Your browser does not support HTML5 video streaming.
              </video>

              {/* Floating Audio Toggle Button (bottom-right on mobile to stay clear of top subtitles) */}
              <div className="absolute bottom-3 right-3 sm:bottom-auto sm:top-3.5 sm:right-3.5 z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 hover:bg-black backdrop-blur-md border border-amber-400/50 text-white text-[11px] sm:text-xs font-bold transition-all shadow-xl active:scale-95 cursor-pointer"
                  title="Toggle Audio"
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-200">Tap for Sound 🔊</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-emerald-300">Sound On 🔊</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Three Decades of Impact Bar (Prominent, High-Visibility Golden Maroon Aesthetic) */}
        <div className="mt-12 sm:mt-16 bg-gradient-to-br from-white via-[#fffcf4] to-[#fff6e6] border-2 border-amber-300 rounded-3xl p-6 sm:p-8 lg:p-10 max-w-5xl mx-auto shadow-xl shadow-amber-900/10 relative overflow-hidden">
          {/* Top Foil Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-950 text-xs sm:text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs mb-3">
              <span className="text-sm">🪔</span>
              <span>Proven Legacy • Empowering Youth Since 1995</span>
            </div>

            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#3d1408] font-serif tracking-tight leading-tight">
              Three Decades of{' '}
              <span className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                Impact
              </span>
            </h3>

            <p className="text-xs sm:text-base text-slate-600 max-w-xl mx-auto mt-2 font-medium">
              Transforming young minds with character, values, and timeless Vedic leadership for over 30 years across India and abroad.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-center">
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={30} suffix="+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Years of Youth Dev</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={120} suffix="+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Colleges Reached</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={50} suffix="L+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Youth Reached</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={10} suffix="K+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Youths Trained</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={3} suffix="K+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Core Volunteers</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">
                <AnimatedCounter to={18} suffix="+" once={true} duration={1.8} />
              </p>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight mt-1">Cities Across USA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: THE SILENT CRISIS (THE PAIN POINTS) ================= */}
      <section id="silent-crisis" className="py-10 sm:py-20 md:py-24 bg-gradient-to-b from-[#fff6e6] via-[#fff1db] to-[#fff8eb] border-y-2 border-amber-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12 md:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-100 via-rose-50 to-amber-100 border border-red-200 text-red-950 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2.5 sm:mb-3.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>A Generation in Severe Crisis</span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-[#421307] tracking-tight leading-snug font-serif px-2 sm:px-0">
              Behind the Silent Screens,
              <span className="block mt-1 sm:mt-2 text-red-700">
                Our Youth Are Struggling in Darkness
              </span>
            </h2>
            <p className="mt-2.5 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-700 max-w-2xl mx-auto leading-relaxed font-normal px-2 sm:px-0">
              Every day, brilliant boys and girls fall prey to screen addiction, depression, loneliness, and despair. These are not just numbers — they are our own children, brothers and sisters.
            </p>
          </div>

          {/* 8 Problem Cards (Horizontal Snap Scroll on Mobile, 4-Col Grid on Laptop) */}
          <div
            ref={crisisScrollRef}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
          >
            {CRISIS_STATS.map((item, idx) => (
              <div key={idx} className="w-[82vw] max-w-[310px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink">
                <CrisisCard item={item} index={idx} onCardClick={scrollToPaymentForm} />
              </div>
            ))}
          </div>

          {/* Mobile Arrow Navigation */}
          <div className="flex sm:hidden items-center justify-center gap-4 mt-3">
            <button
              type="button"
              onClick={() => scrollCrisis('left')}
              className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Previous Crisis Card"
            >
              <ChevronLeft className="w-5 h-5 text-amber-800" />
            </button>

            <span className="text-xs font-black text-amber-950 bg-amber-100/90 border border-amber-300 px-3.5 py-1.5 rounded-full shadow-2xs">
              8 Real Crises
            </span>

            <button
              type="button"
              onClick={() => scrollCrisis('right')}
              className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Next Crisis Card"
            >
              <ChevronRight className="w-5 h-5 text-amber-800" />
            </button>
          </div>

          {/* Call to Conscience Banner */}
          <div className="mt-8 sm:mt-12 text-center p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-[#fffdf9] to-[#fff6e6] border-2 border-amber-300/90 max-w-3xl mx-auto shadow-xl shadow-amber-900/10 relative overflow-hidden ring-1 ring-amber-400/20">
            {/* Top Foil Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500" />

            {/* Sacred Diya Centerpiece Badge */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <span className="text-lg sm:text-xl filter drop-shadow-xs">🪔</span>
            </div>

            <h4 className="text-base sm:text-2xl font-black text-[#44180b] font-serif leading-snug max-w-xl mx-auto">
              Without spiritual shelter and genuine values, where will our youth go?
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 mt-2 max-w-xl mx-auto leading-relaxed font-normal px-2 sm:px-0">
              Your contribution doesn&apos;t just support an organization — it pulls a vulnerable young soul out of depression, addiction, and despair into purposeful living.
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToSchemes}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 border border-amber-300 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <span>Support a Youth Today</span>
                <ArrowRight className="w-4 h-4 text-amber-950" />
              </button>
            </div>
            <p className="mt-3 text-[11px] font-semibold text-amber-900/70 flex items-center justify-center gap-1.5">
              <span>✦</span>
              <span>Tax Benefits Under Sec 80G</span>
              <span>✦</span>
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: THE VOICE SOLUTION (6 PILLARS OF TRANSFORMATION) ================= */}
      <section className="py-10 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2.5 sm:mb-3.5 shadow-2xs">
            <span className="text-xs">🪔</span>
            <span>The Proven Antidote</span>
          </div>
          <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-[#3d1408] tracking-tight leading-snug font-serif px-2 sm:px-0">
            The 6 Pillars of <br className="hidden sm:inline" />
            <span className="block sm:inline mt-1 sm:mt-0 bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
              Complete Transformation
            </span>
          </h2>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-700 max-w-2xl mx-auto leading-relaxed font-normal px-3 sm:px-0">
            How VOICE Gurukul systematically mentors youth with character, academic excellence, mental calmness, and moral fortitude:
          </p>
        </div>

        {/* The 6 Pillars Feature Grid / Mobile Horizontal Scroll */}
        <div className="relative">
          <div
            ref={pillarsScrollRef}
            className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none"
          >
            {SIX_PILLARS.map((item, idx) => (
              <div key={idx} className="w-[84vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink">
                <PillarCard item={item} index={idx} onCardClick={scrollToPaymentForm} />
              </div>
            ))}
          </div>

          {/* Mobile Arrow Navigation */}
          <div className="flex md:hidden items-center justify-center gap-4 mt-5">
            <button
              type="button"
              onClick={() => scrollPillars('left')}
              className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Previous Pillar"
            >
              <ChevronLeft className="w-5 h-5 text-amber-800" />
            </button>
            <span className="text-xs font-black text-amber-950 bg-amber-100/90 border border-amber-300 px-3.5 py-1.5 rounded-full shadow-2xs">
              6 Pillars of Growth
            </span>
            <button
              type="button"
              onClick={() => scrollPillars('right')}
              className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
              aria-label="Next Pillar"
            >
              <ChevronRight className="w-5 h-5 text-amber-800" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: CONTRIBUTION SCHEMES & PAYMENT FORM ================= */}
      <section ref={formRef} id="contribute-form" className="py-10 sm:py-20 md:py-24 bg-gradient-to-b from-[#fffaf0] via-[#fff4dc] to-[#fffdf7] border-t-2 border-amber-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2.5 sm:mb-3.5 shadow-2xs">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Help Us To Help The Youth</span>
            </div>
            <h2 className="text-xl sm:text-3xl md:text-5xl font-black text-[#401509] tracking-tight leading-snug font-serif px-2 sm:px-0">
              Become a Partner in <br className="hidden sm:inline" />
              <span className="block sm:inline mt-1 sm:mt-0 bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                Shaping the Future of Young India
              </span>
            </h2>
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-700 max-w-2xl mx-auto leading-relaxed font-normal px-3 sm:px-0">
              Select a contribution scheme below to sponsor youth welfare, value education, and spiritual guidance:
            </p>
          </div>

          {/* 6 Schemes Grid (Horizontal Snap Scroll on Mobile, 3-Col Grid on Laptop) */}
          <div className="relative mb-14">
            <div
              ref={schemesScrollRef}
              className="relative flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pt-6 pb-5 sm:pt-5 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
            >
              {DONATION_SCHEMES.map((scheme) => {
                const isSelected = selectedSchemeId === scheme.id;
                return (
                    <div
                      key={scheme.id}
                      data-featured={scheme.featured ? "true" : undefined}
                      id={`scheme-card-${scheme.id}`}
                      className="w-[84vw] max-w-[320px] shrink-0 snap-center sm:w-auto sm:max-w-none sm:shrink flex flex-col"
                    >
                      <div
                        onClick={() => selectScheme(scheme)}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between h-full ${isSelected
                          ? 'bg-white border-amber-500 shadow-2xl shadow-amber-500/25 scale-[1.02] ring-4 ring-amber-300/40'
                          : 'bg-white hover:bg-amber-50/50 border-amber-200 hover:border-amber-400 shadow-md'
                          }`}
                      >
                        {scheme.featured && (
                          <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-amber-950 font-black text-[10px] tracking-wider uppercase px-3.5 py-1 rounded-full shadow-lg border-2 border-amber-200 z-20 flex items-center gap-1">
                            <span>★</span>
                            <span>Most Chosen</span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${scheme.accent}`}>
                              {scheme.badge}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                <Check className="w-3 h-3 text-amber-700" /> Selected
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-black text-slate-900">{scheme.name}</h3>
                          <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 mb-4">{scheme.range}</p>

                          <div className="space-y-2.5 pt-3 border-t border-slate-100">
                            {scheme.benefits.map((benefit, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-snug">{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectScheme(scheme);
                          }}
                          className={`mt-6 w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${isSelected
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-amber-950 shadow-md shadow-amber-500/30 border-amber-400'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                        >
                          <span>{isSelected ? 'Selected Scheme' : `Choose ${scheme.name}`}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    );
              })}
                  </div>

            {/* Mobile Arrow Navigation */ }
                <div className="flex sm:hidden items-center justify-center gap-4 mt-5">
                  <button
                    type="button"
                    onClick={() => scrollSchemesCarousel('left')}
                    className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
                    aria-label="Previous Scheme"
                  >
                    <ChevronLeft className="w-5 h-5 text-amber-800" />
                  </button>
                  <span className="text-xs font-black text-amber-950 bg-amber-100/90 border border-amber-300 px-3.5 py-1.5 rounded-full shadow-2xs">
                    6 Sacred Schemes
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollSchemesCarousel('right')}
                    className="w-10 h-10 rounded-full bg-white border-2 border-amber-300 shadow-md text-amber-900 flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all cursor-pointer"
                    aria-label="Next Scheme"
                  >
                    <ChevronRight className="w-5 h-5 text-amber-800" />
                  </button>
                </div>
          </div>

            {/* Scheme Comparison Table Trigger */}
            <div className="text-center mb-12">
              <button
                onClick={() => setShowFullTableModal(true)}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:text-amber-950 bg-white hover:bg-amber-50 border-2 border-amber-300 px-5 py-2.5 rounded-xl shadow-xs transition-all"
              >
                <Info className="w-4 h-4 text-amber-600" />
                <span>View Full Scheme Benefits Comparison Matrix</span>
              </button>
            </div>

            {/* ================= PAYMENT FORM CONTAINER (RADIANT IVORY & GOLD) ================= */}
            <div ref={paymentFormRef} id="sacred-offering-form" className="max-w-2xl mx-auto bg-gradient-to-b from-white via-[#fffdf9] to-[#fffaf2] border-2 border-amber-300/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-xl shadow-amber-900/10 scroll-mt-8 relative overflow-hidden ring-1 ring-amber-400/20">
              {/* Top Gold Foil Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500" />

              <div className="text-center mb-6 sm:mb-8 pt-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                  <span className="text-xl sm:text-2xl filter drop-shadow-xs">🪔</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#44180b] font-serif leading-tight">Complete Your Sacred Offering</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  Every rupee is dedicated to nurturing values, prasadam distribution, and youth character education.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4 sm:space-y-5">
                {/* Amount Selection */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-amber-950 uppercase tracking-wider mb-1.5">
                    Contribution Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-black text-amber-700">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-3.5 py-3 sm:py-3.5 bg-amber-50/50 border-2 border-amber-300 focus:border-amber-500 focus:bg-white rounded-xl text-base sm:text-lg font-black text-amber-950 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Quick Amount Pills (Symmetrical 3-Column Grid on Mobile) */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 mt-2.5">
                    {[2100, 5100, 11000, 21000, 51000, 100000].map((amt) => {
                      const isAct = formData.amount === String(amt);
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFormData({ ...formData, amount: String(amt) })}
                          className={`py-2 px-1 text-xs font-black rounded-lg border text-center transition-all cursor-pointer ${isAct
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950 border-amber-400 shadow-sm'
                            : 'bg-white hover:bg-amber-50/80 text-slate-700 border-amber-200/90'
                            }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full Legal Name */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Legal Name (as per PAN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    placeholder="e.g. Ramesh Chandra Sharma"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* Mobile and Email in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.donorMobile}
                      onChange={(e) => setFormData({ ...formData, donorMobile: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.donorEmail}
                      onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                      placeholder="you@email.com"
                      className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* PAN Number for 80G Tax Exemption */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                      PAN Card Number
                    </label>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> 80G Eligible
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.donorPan}
                    onChange={(e) => setFormData({ ...formData, donorPan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F (for 80G Tax Receipt)"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all uppercase"
                  />
                </div>

                {/* Address (Optional) */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Postal Address (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.donorAddress}
                    onChange={(e) => setFormData({ ...formData, donorAddress: e.target.value })}
                    placeholder="For delivering special gifts or calendar (optional)"
                    className="w-full px-3.5 py-2 sm:py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all resize-none"
                  />
                </div>

                {/* Submit Payment CTA */}
                <button
                  type="button"
                  disabled={!isFormValid || isProcessing}
                  onClick={handlePayment}
                  className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all border ${isFormValid && !isProcessing
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 shadow-amber-500/30 hover:scale-[1.01] active:scale-98 border-amber-400 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                    }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base sm:text-lg">🪔</span>
                      <span>Contribute ₹{parseFloat(formData.amount || '0').toLocaleString('en-IN')} Securely</span>
                    </>
                  )}
                </button>

                {/* Indian Passport Holder Notice */}
                <p className="text-center text-[11px] sm:text-xs text-amber-900 font-semibold pt-0.5">
                  Donations accepted only from Indian Passport holders
                </p>

                {/* Trust Badges */}
                <div className="pt-3.5 border-t border-amber-200/60 flex items-center justify-center gap-8 sm:gap-14 text-center text-[11px] text-slate-600 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>80G Deductible</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* ================= SUCCESS MODAL ================= */}
      <AnimatePresence>
        {isSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-300">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-black text-[#421307] font-serif">Hare Krishna! Thank You!</h3>
              <p className="text-sm text-amber-800 font-bold mt-1">
                Your sacred offering of ₹{parseFloat(formData.amount || '0').toLocaleString('en-IN')} has been received.
              </p>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed font-medium">
                May Sri Sri Radha Vrindavan Chandra, Jagganath Baladev Subadra, Sri Sri Gaur Nitai, and Balaji Bhagavan bestow eternal blessings, divine peace, and auspiciousness upon you and your family.
              </p>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                We express our heartfelt gratitude for your generous offering in support of the sacred mission of VOICE Gurukul.
              </div>

              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider shadow-md transition-all border border-amber-400"
              >
                Close &amp; Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= FULL MATRIX MODAL ================= */}
      <AnimatePresence>
        {showFullTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-800"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-200 mb-6">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-[#44180b] font-serif">Donation Schemes &amp; Benefits Matrix</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Comprehensive overview of blessed benefits across all tiers</p>
                </div>
                <button
                  onClick={() => setShowFullTableModal(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                  Close ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-amber-300 bg-amber-50/80 text-amber-950 font-black">
                      <th className="py-3.5 px-3">Donation Category</th>
                      <th className="py-3.5 px-3">Scheme</th>
                      <th className="py-3.5 px-3 text-center">Sri Balaji Puja</th>
                      <th className="py-3.5 px-3 text-center">Youth Report</th>
                      <th className="py-3.5 px-3 text-center">Gifts</th>
                      <th className="py-3.5 px-3 text-center">Special Calendar</th>
                      <th className="py-3.5 px-3 text-center">Book Set</th>
                      <th className="py-3.5 px-3 text-center">Home Katha</th>
                      <th className="py-3.5 px-3 text-center">Guest of Honor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    <tr className="hover:bg-amber-50/40">
                      <td className="py-3 px-3 font-bold text-amber-800">₹2,100 to ₹5,099</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">Hope Giver</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                    </tr>
                    <tr className="hover:bg-amber-50/40">
                      <td className="py-3 px-3 font-bold text-amber-800">₹5,100 to ₹10,999</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">Youth Friend</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                    </tr>
                    <tr className="bg-amber-100/70 border-y border-amber-300">
                      <td className="py-3.5 px-3 font-black text-amber-900">₹11,000 to ₹20,999</td>
                      <td className="py-3.5 px-3 font-black text-amber-950">Youth Guardian</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-slate-300">—</td>
                      <td className="py-3.5 px-3 text-center text-slate-300">—</td>
                      <td className="py-3.5 px-3 text-center text-slate-300">—</td>
                    </tr>
                    <tr className="hover:bg-amber-50/40">
                      <td className="py-3 px-3 font-bold text-amber-800">₹21,000 to ₹50,999</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">Legacy Builder</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                    </tr>
                    <tr className="hover:bg-amber-50/40">
                      <td className="py-3 px-3 font-bold text-amber-800">₹51,000 to ₹99,999</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">Generation Shaper</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-black">✓</td>
                      <td className="py-3 px-3 text-center text-slate-300">—</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-amber-100 to-yellow-50">
                      <td className="py-3.5 px-3 font-black text-amber-950">₹1,00,000 &amp; above</td>
                      <td className="py-3.5 px-3 font-black text-amber-950">Nation Builder</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                      <td className="py-3.5 px-3 text-center text-emerald-700 font-black">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowFullTableModal(false)}
                  className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all border border-amber-400"
                >
                  Select a Scheme to Contribute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Donation Action Button */}
      <AnimatePresence>
        {showFloatingBtn && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40"
          >
            <button
              type="button"
              onClick={scrollToSchemes}
              className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-amber-950 font-black shadow-[0_12px_28px_-6px_rgba(217,119,6,0.45)] border-2 border-amber-200/90 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden ring-2 ring-amber-400/30"
              aria-label="Contribute to VOICE youth welfare schemes"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
              <span className="text-xl sm:text-2xl filter drop-shadow-xs">🪔</span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950">
                Donate Now
              </span>
              <ArrowRight className="w-4 h-4 text-amber-950 group-hover:translate-x-1 transition-transform ml-0.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= THEMED PUBLIC FOOTER (REGAL VEDIC GOLD & MAHOGANY) ================= */}
      <footer className="relative bg-gradient-to-b from-[#240c04] via-[#1c0803] to-[#120401] text-amber-100/80 border-t-2 border-amber-500/40 overflow-hidden">
        {/* Top Gold Foil Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 w-full" />

        {/* Decorative Golden Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-12 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 sm:gap-8 md:gap-10">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="group inline-flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-xs">🪔</span>
                <span className="text-2xl font-black text-amber-200 font-serif tracking-tight group-hover:text-amber-100 transition-colors">
                  VOICE Gurukul
                </span>
              </Link>
              <p className="text-xs text-amber-100/70 leading-relaxed font-normal">
                Vedic Oasis for Inspiration, Culture &amp; Education. Empowering university youth with character, leadership, mental resilience, and spiritual principles across 120+ centres.
              </p>
            </div>

            {/* Quick Links with 6-page sequence */}
            <div className="col-span-1">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-4 font-serif flex items-center gap-1.5">
                <span>✦</span>
                <span>Website Pages</span>
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                {[
                  { name: '1. Home', href: '/' },
                  { name: '2. About Us', href: '/about' },
                  { name: '3. Activities', href: '/programmes' },
                  { name: '4. VOICE Centres', href: '/centres' },
                  { name: '5. Testimonials', href: '/stories' },
                  { name: '6. Collaborate & Partner', href: '/collaborate' },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-amber-100/75 hover:text-amber-200 hover:translate-x-1 transition-all inline-flex items-center gap-1 group"
                    >
                      <span>{item.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Policies */}
            <div className="col-span-1">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-4 font-serif flex items-center gap-1.5">
                <span>✦</span>
                <span>Compliance &amp; Policies</span>
              </h4>
              <ul className="space-y-2.5 text-xs font-medium">
                <li>
                  <Link href="/terms" className="text-amber-100/75 hover:text-amber-200 hover:translate-x-1 transition-all inline-block">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-amber-100/75 hover:text-amber-200 hover:translate-x-1 transition-all inline-block">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-amber-100/75 hover:text-amber-200 hover:translate-x-1 transition-all inline-block">
                    Cancellation &amp; Refund Policy
                  </Link>
                </li>
                <li className="pt-2">
                  <a
                    href="#contribute-form"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSchemes();
                    }}
                    className="text-amber-300 hover:text-amber-200 font-bold transition-colors inline-flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-500/30 px-3 py-1.5 rounded-lg"
                  >
                    <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-[11px]">Sponsor Yuva Meals (80G)</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div className="col-span-2 md:col-span-1">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-4 font-serif flex items-center gap-1.5">
                <span>✦</span>
                <span>Contact &amp; Support</span>
              </h4>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 text-amber-100/80">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <a href="mailto:manager@voicepune.com" className="hover:text-amber-200 hover:underline transition-colors">
                    manager@voicepune.com
                  </a>
                </div>
                <div className="flex items-center gap-2.5 text-amber-100/80">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <a href="tel:+917378709688" className="hover:text-amber-200 hover:underline transition-colors">
                    +91 73787 09688
                  </a>
                </div>
                <div className="flex items-start gap-2.5 text-amber-100/70 pt-1">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">VOICE Pune Headquarters, Maharashtra, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-amber-900/60 flex items-center justify-center text-xs text-amber-200/60 text-center">
            <p>© {new Date().getFullYear()} VOICE Gurukul. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

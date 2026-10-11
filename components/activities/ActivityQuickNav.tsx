'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'value-based-seminars', label: 'Value Based Seminars' },
  { id: 'software-training', label: 'Software Training' },
  { id: 'de-addiction', label: 'De-Addiction Workshops & Data' },
  { id: 'corporate', label: 'Corporate Activities & Logos' },
  { id: 'teachers-program', label: 'Teachers Program' },
  { id: 'festivals', label: 'Cultural Festivals' },
  { id: 'music-and-art', label: 'Music & Art' },
  { id: 'public-presentation', label: 'Public Presentation & GD' },
];

export default function ActivityQuickNav() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>('value-based-seminars');

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      // Navbar is 80px + QuickNav is ~52px -> offset by -135px
      const yOffset = -135;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Automatically scroll the horizontal slider so the active button is always centered and visible
  useEffect(() => {
    if (activeId && containerRef.current) {
      const activeBtn = containerRef.current.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
      if (activeBtn) {
        const container = containerRef.current;
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const containerWidth = container.offsetWidth;
        const targetScrollLeft = btnLeft - (containerWidth / 2) + (btnWidth / 2);

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [activeId]);

  // Robust Scroll Spy to update activeId as user scrolls down the page
  useEffect(() => {
    const handleScroll = () => {
      // Trigger threshold below sticky navbar + quick jump bar
      const triggerY = 160;
      let currentActive = NAV_ITEMS[0].id;

      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerY && rect.bottom > triggerY) {
            currentActive = item.id;
            break;
          }
          if (rect.top <= triggerY) {
            currentActive = item.id;
          }
        }
      }

      setActiveId((prev) => (prev !== currentActive ? currentActive : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-y border-slate-200/90 shadow-sm py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
        <div className="hidden md:flex items-center space-x-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 pr-3 border-r border-slate-200">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Quick Jump:</span>
        </div>

        {/* Scroll Left Button */}
        <button
          onClick={() => scrollNav('left')}
          className="w-7 h-7 rounded-full bg-white/90 border border-slate-200 shadow-xs hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors shrink-0 flex items-center justify-center"
          title="Scroll navigation left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Horizontal Nav Bar with Hidden Scrollbars and Smooth Auto-Center */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className="flex items-center space-x-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1 flex-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                data-nav-id={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.03]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={() => scrollNav('right')}
          className="w-7 h-7 rounded-full bg-white/90 border border-slate-200 shadow-xs hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors shrink-0 flex items-center justify-center"
          title="Scroll navigation right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

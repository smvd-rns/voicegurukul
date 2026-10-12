'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileAutoScrollCarouselProps {
  children: ReactNode[];
  autoScrollInterval?: number;
  activeColorClass?: string;
  cardWidthClass?: string;
}

export default function MobileAutoScrollCarousel({
  children,
  autoScrollInterval = 5000,
  activeColorClass = 'bg-indigo-600',
  cardWidthClass = 'w-[86vw] max-w-[380px]',
}: MobileAutoScrollCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const count = children.length;

  useEffect(() => {
    if (isPaused || count <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, autoScrollInterval);
    return () => clearInterval(interval);
  }, [isPaused, count, autoScrollInterval]);

  const scrollToIndex = (idx: number) => {
    setActiveIndex(idx);
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[idx] as HTMLElement;
    if (child) {
      container.scrollTo({
        left: child.offsetLeft - container.offsetLeft,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container || count === 0) return;
    const scrollLeft = container.scrollLeft;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      const diff = Math.abs(child.offsetLeft - container.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    if (closestIdx !== activeIndex) {
      setActiveIndex(closestIdx);
    }
  };

  if (!children || children.length === 0) return null;

  return (
    <div
      className="w-full space-y-3 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Horizontal Snap Scroll Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 py-2 px-1 scroll-smooth"
      >
        {children.map((child, idx) => (
          <div key={idx} className={`shrink-0 snap-center ${cardWidthClass}`}>
            {child}
          </div>
        ))}
      </div>

      {/* Navigation Controls: Prev, Next & Indicator Dots */}
      {count > 1 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex > 0 ? activeIndex - 1 : count - 1)}
            className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous card"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots (limited to max 8 dots or a count badge) */}
          <div className="flex items-center space-x-1.5">
            {count <= 8 ? (
              children.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx
                      ? `w-6 ${activeColorClass} shadow-2xs`
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))
            ) : (
              <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                {activeIndex + 1} / {count}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex < count - 1 ? activeIndex + 1 : 0)}
            className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Next card"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { DE_ADDICTION_DATA } from './activityData';

export default function DeAddictionGraph() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxRate = 15; // Scale max for 14.2

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl p-4 sm:p-6 border border-rose-200/80 shadow-lg shadow-rose-950/5 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-black uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Ministry of Social Justice &amp; Empowerment</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {DE_ADDICTION_DATA.chartTitle}
          </h3>
          <p className="text-[11px] text-rose-600 font-semibold tracking-wide">
            Per million population
          </p>
        </div>

        {/* ResearchGate Reference Link Button */}
        <a
          href={DE_ADDICTION_DATA.referenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto group"
        >
          <span>ResearchGate Source</span>
          <ExternalLink className="w-3.5 h-3.5 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Horizontal Bar Chart (Matching Research Paper Figure) */}
      <div className="pt-3 space-y-1.5 sm:space-y-2">
        {DE_ADDICTION_DATA.statesData.map((item, idx) => {
          const widthPercent = (item.rate / maxRate) * 100;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.state}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`group flex items-center gap-2.5 sm:gap-3 px-2 py-1 rounded-lg transition-colors ${
                isHovered
                  ? 'bg-rose-50/80 ring-1 ring-rose-200'
                  : 'hover:bg-slate-50'
              }`}
            >
              {/* State Name */}
              <div className="w-28 sm:w-36 text-right shrink-0">
                <span className="text-xs font-bold tracking-tight text-slate-800 block truncate">
                  {item.state}
                </span>
              </div>

              {/* Red Bar Track */}
              <div className="flex-1 bg-slate-100 h-4 sm:h-4.5 rounded-md overflow-hidden relative flex items-center p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${widthPercent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.03, ease: 'easeOut' }}
                  className="h-full rounded bg-gradient-to-r from-red-500 via-rose-500 to-red-600 flex items-center justify-end pr-1.5 shadow-xs"
                >
                  <span className="text-[9px] font-black text-white drop-shadow-xs">
                    {item.rate}
                  </span>
                </motion.div>
              </div>

              {/* Rate Value */}
              <div className="w-10 text-left shrink-0">
                <span className="text-xs font-bold text-slate-700">
                  {item.rate}
                  <span className="text-[9px] text-slate-400 font-normal ml-0.5">/M</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with Clickable Citation */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex items-center space-x-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Suicides in Some of Indian States Due to Drug Abuse.</span>
        </div>
        <div>
          <span>Source: </span>
          <a
            href={DE_ADDICTION_DATA.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1 underline underline-offset-2 transition-colors"
          >
            Ministry of Social Justice and Empowerment / ResearchGate
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

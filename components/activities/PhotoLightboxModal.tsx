'use client';

import { useEffect } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityPhoto } from './activityData';

interface PhotoLightboxModalProps {
  photo: ActivityPhoto | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function PhotoLightboxModal({
  photo,
  onClose,
  onPrev,
  onNext,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 max-w-5xl w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-md sm:max-w-lg">
              {photo.title}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`https://drive.google.com/file/d/${photo.driveId}/view?usp=sharing`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Open full file in Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container with Prev/Next controls */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://lh3.googleusercontent.com/d/${photo.driveId}=s1600`}
            alt={photo.title}
            className="max-h-[70vh] w-auto max-w-full object-contain mx-auto"
          />

          {onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110"
              title="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110"
              title="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Caption */}
        {photo.caption && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-slate-300 text-xs sm:text-sm">
            {photo.caption}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Loader2, Maximize2 } from 'lucide-react';

interface DriveImageProps {
  driveId: string;
  alt: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  showZoomIcon?: boolean;
}

export default function DriveImage({
  driveId,
  alt,
  size = 800,
  className = '',
  imgClassName = '',
  onClick,
  showZoomIcon = true,
}: DriveImageProps) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setAttempt(0);
  }, [driveId]);

  // Directly use lh3 CDN as primary as requested by user
  const sources = [
    `https://lh3.googleusercontent.com/d/${driveId}=s${size}`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`,
    `https://drive.google.com/uc?export=view&id=${driveId}`,
  ];

  const currentSrc = sources[Math.min(attempt, sources.length - 1)];

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden group select-none bg-slate-50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-10">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin opacity-60" />
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          if (attempt < sources.length - 1) {
            setAttempt((prev) => prev + 1);
          } else {
            setLoading(false);
          }
        }}
        className={`w-full h-full object-cover transition-transform duration-500 ${loading ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
          } ${imgClassName}`}
      />

      {showZoomIcon && onClick && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 pointer-events-none">
          <div className="p-2.5 rounded-full bg-white/90 text-slate-900 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

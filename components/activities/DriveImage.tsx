'use client';

import { useState, useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';

interface DriveImageProps {
  driveId: string;
  alt: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  showZoomIcon?: boolean;
  priority?: boolean;
}

export default function DriveImage({
  driveId,
  alt,
  size = 600,
  className = '',
  imgClassName = '',
  onClick,
  showZoomIcon = true,
  priority = false,
}: DriveImageProps) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoading(true);
    setAttempt(0);
  }, [driveId]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoading(false);
    }
  }, [attempt, driveId]);

  // Fast direct Google CDN (lh3) as primary with no-referrer
  const sources = [
    `https://lh3.googleusercontent.com/d/${driveId}=s${size}`,
    `https://lh3.googleusercontent.com/d/${driveId}=w${size}`,
    `https://lh3.googleusercontent.com/d/${driveId}`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`,
  ];

  const currentSrc = sources[Math.min(attempt, sources.length - 1)];

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden group select-none bg-slate-100 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Subtle background shimmer placeholder instead of heavy spinning loader */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse z-0 pointer-events-none" />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setLoading(false)}
        onError={() => {
          if (attempt < sources.length - 1) {
            setAttempt((prev) => prev + 1);
          } else {
            setLoading(false);
          }
        }}
        className={`w-full h-full object-cover transition-all duration-300 relative z-10 ${
          loading ? 'opacity-40 filter blur-xs' : 'opacity-100'
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

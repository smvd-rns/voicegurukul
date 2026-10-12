'use client';

import { useState } from 'react';
import { ActivityPhoto } from './activityData';
import DriveImage from './DriveImage';
import PhotoLightboxModal from './PhotoLightboxModal';

interface ActivityPhotoGalleryProps {
  photos: ActivityPhoto[];
  reverse?: boolean;
}

export default function ActivityPhotoGallery3D({
  photos,
  reverse = false,
}: ActivityPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ActivityPhoto | null>(null);

  if (!photos || photos.length === 0) return null;

  // Repeat photos to build two identical halves for a 100% seamless infinite loop
  const repeatCount = Math.max(3, Math.ceil(8 / photos.length));
  let oneHalf: ActivityPhoto[] = [];
  for (let i = 0; i < repeatCount; i++) {
    oneHalf = oneHalf.concat(photos);
  }
  const trackPhotos = [...oneHalf, ...oneHalf];

  const animationClass = reverse
    ? 'animate-photo-slider-reverse'
    : 'animate-photo-slider';

  return (
    <div className="relative py-1 w-full overflow-hidden select-none">
      {/* Soft gradient edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

      {/* Continuous Moving Infinite Marquee Track */}
      <div className="w-full overflow-hidden">
        <div
          className={`flex items-center gap-3 sm:gap-4 md:gap-5 w-max py-2 px-1 ${animationClass} hover:[animation-play-state:paused] active:[animation-play-state:paused]`}
        >
          {trackPhotos.map((photo, idx) => (
            <div
              key={`${photo.driveId}-${idx}`}
              onClick={() => setSelectedPhoto(photo)}
              className="w-[155px] sm:w-[200px] md:w-[260px] shrink-0 cursor-pointer group transition-transform duration-200 hover:scale-[1.03] active:scale-95"
            >
              {/* Compact, Beautiful Photo Tile */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-slate-200/90 shadow-2xs hover:shadow-md group-hover:border-indigo-400 transition-all overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-slate-100">
                  <DriveImage
                    driveId={photo.driveId}
                    alt={photo.title || 'VOICE Activity'}
                    size={600}
                    className="w-full h-full"
                  />
                </div>
                {photo.title && (
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-700 truncate mt-1.5 px-0.5 leading-tight">
                    {photo.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal with Next / Prev Navigation */}
      {selectedPhoto && (
        <PhotoLightboxModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onPrev={() => {
            const current = photos.findIndex((p) => p.driveId === selectedPhoto.driveId);
            const prev = (current - 1 + photos.length) % photos.length;
            setSelectedPhoto(photos[prev]);
          }}
          onNext={() => {
            const current = photos.findIndex((p) => p.driveId === selectedPhoto.driveId);
            const next = (current + 1) % photos.length;
            setSelectedPhoto(photos[next]);
          }}
        />
      )}
    </div>
  );
}

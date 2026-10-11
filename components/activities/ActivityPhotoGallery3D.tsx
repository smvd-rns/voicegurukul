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

  // Duplicate photos 4x to guarantee a smooth, seamless infinite loop
  const duplicatedPhotos = [...photos, ...photos, ...photos, ...photos];

  const animationClass = reverse
    ? 'animate-photo-slider-reverse'
    : 'animate-photo-slider';

  return (
    <div className="relative py-2 w-full overflow-hidden">
      {/* Soft gradient edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

      {/* Auto-Rotating Continuous Marquee Track */}
      <div className="w-full overflow-hidden">
        <div
          className={`flex items-center gap-5 sm:gap-6 w-max py-2 px-2 ${animationClass} hover:[animation-play-state:paused]`}
        >
          {duplicatedPhotos.map((photo, idx) => (
            <div
              key={`${photo.driveId}-${idx}`}
              onClick={() => setSelectedPhoto(photo)}
              className="w-[280px] sm:w-[350px] shrink-0 cursor-pointer group transition-transform duration-300 hover:scale-[1.03]"
            >
              {/* Clean Upright Photo Card */}
              <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-md group-hover:shadow-xl group-hover:border-indigo-400 transition-all overflow-hidden">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                  <DriveImage
                    driveId={photo.driveId}
                    alt={photo.title || 'VOICE Activity'}
                    size={800}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <PhotoLightboxModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

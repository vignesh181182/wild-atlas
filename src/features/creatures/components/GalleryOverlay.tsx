'use client';

import { useEffect } from 'react';
import type { CreatureDetail } from '@/lib/types';
import { Plate } from '@/features/creatures/components/Plate';
import { CloseIcon } from '@/components/icons';

type GalleryOverlayProps = {
  creature: CreatureDetail;
  onClose: () => void;
};

export function GalleryOverlay({ creature, onClose }: GalleryOverlayProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="gallery" role="dialog" aria-label={`Photographs of ${creature.name}`}>
      <div className="gallery-head">
        <span className="name">{creature.name}</span>
        <span className="count">
          {creature.photos.length} {creature.photos.length === 1 ? 'photograph' : 'photographs'}
        </span>
        <button
          type="button"
          className="btn-icon"
          data-tip="Close (Esc)"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="view">
        <div className="gallery-grid">
          {creature.photos.map((photo, i) => (
            <Plate
              key={photo.url}
              photo={photo}
              alt={`${creature.name}, photograph ${i + 1}`}
              variant="gallery"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

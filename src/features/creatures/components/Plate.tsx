/**
 * A photograph in its paper mount — the sepia-washed plate that the design
 * uses everywhere a picture appears. When there is no photograph, the mount
 * stays and shows its hatched backing paper instead.
 */

import type { Photo } from '@/lib/types';

type PlateProps = {
  photo?: Photo | null;
  /** Falls back to a plain URL when all we have is a thumbnail. */
  src?: string | null;
  alt: string;
  /** Size modifier: plate-card, plate-gallery, plate-row. */
  variant: 'card' | 'gallery' | 'row';
  /** Overrides the default caption (the photographer credit). */
  caption?: string | null;
  children?: React.ReactNode;
};

export function Plate({ photo, src, alt, variant, caption, children }: PlateProps) {
  const url = photo?.url ?? src ?? null;
  const credit = caption === undefined ? (photo?.attribution ?? null) : caption;

  return (
    <div className={`plate plate-${variant}`}>
      {url ? (
        // Plain <img>: these come from a handful of iNaturalist CDN hosts at
        // sizes we already control, so the optimiser has nothing to add.
        <img src={url} alt={alt} loading="lazy" />
      ) : null}
      {credit ? <span className="plate-caption">{credit}</span> : null}
      {children}
    </div>
  );
}

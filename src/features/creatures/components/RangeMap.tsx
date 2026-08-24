'use client';

/**
 * Where a creature has been logged, drawn as dots on the world.
 *
 * The map is a single SVG path and some arithmetic (see lib/world-land) —
 * no tiles, no key, no mapping library — which is what lets it sit inside the
 * page looking like the rest of the atlas rather than like an embedded app.
 */

import { useMemo } from 'react';
import type { Sighting } from '@/lib/types';
import { MAP_HEIGHT, MAP_WIDTH, WORLD_LAND_PATH, project } from '@/features/creatures/server/world-land';

export type ViewBox = { x: number; y: number; w: number; h: number };

export const WHOLE_WORLD: ViewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };

/**
 * Frame the dots rather than the planet: a creature that only lives in Japan
 * is a smudge on a world map and a country on a fitted one. Widened to the
 * given aspect and never zoomed past the point where the coastline is useful.
 */
export function fitToSightings(sightings: Sighting[], aspect = MAP_WIDTH / MAP_HEIGHT): ViewBox {
  if (sightings.length < 2) return WHOLE_WORLD;

  const points = sightings.map((s) => project(s.lng, s.lat));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 40;

  let x = Math.min(...xs) - pad;
  let y = Math.min(...ys) - pad;
  let w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  let h = Math.max(...ys) - Math.min(...ys) + pad * 2;

  // Keep the frame's shape, then stop it getting so tight that the coastline
  // beneath the dots is unrecognisable.
  if (w / h < aspect) {
    const widened = h * aspect;
    x -= (widened - w) / 2;
    w = widened;
  } else {
    const heightened = w / aspect;
    y -= (heightened - h) / 2;
    h = heightened;
  }
  if (w < 160) {
    x -= (160 - w) / 2;
    y -= (160 / aspect - h) / 2;
    h = 160 / aspect;
    w = 160;
  }

  return { x, y, w, h };
}

type RangeMapProps = {
  sightings: Sighting[];
  view: ViewBox;
  /** Dots get smaller as you zoom in, so the shape of a cluster stays readable. */
  dotScale?: number;
  className?: string;
  /** The overlay needs the element itself to turn a mouse position into a place. */
  svgRef?: React.Ref<SVGSVGElement>;
};

export function RangeMap({ sightings, view, dotScale = 1, className, svgRef }: RangeMapProps) {
  const dots = useMemo(
    () => sightings.map((s) => ({ ...project(s.lng, s.lat), key: `${s.lat},${s.lng}` })),
    [sightings],
  );

  // One stroke width in viewBox units, so hairlines stay hairlines at any zoom.
  const unit = view.w / MAP_WIDTH;

  return (
    <svg
      ref={svgRef}
      className={className ? `range-map ${className}` : 'range-map'}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${sightings.length} logged sightings, plotted on a world map`}
    >
      <rect
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
        className="range-map-sea"
      />
      <path d={WORLD_LAND_PATH} className="range-map-land" strokeWidth={0.7 * unit} />

      {/* The equator, for orientation — this many dots north of it is a fact. */}
      <line
        x1={view.x}
        x2={view.x + view.w}
        y1={MAP_HEIGHT / 2}
        y2={MAP_HEIGHT / 2}
        className="range-map-equator"
        strokeWidth={0.6 * unit}
        strokeDasharray={`${4 * unit} ${4 * unit}`}
      />

      <g className="range-map-dots">
        {dots.map((dot, i) => (
          <circle key={`${dot.key}-${i}`} cx={dot.x} cy={dot.y} r={3.2 * unit * dotScale} />
        ))}
      </g>
    </svg>
  );
}

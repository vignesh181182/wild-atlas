'use client';

/**
 * The map at full size: the same dots, but zoomable, and followed by the drawn
 * range map where Wikimedia has one. The two answer different questions and it
 * is worth seeing them together — sightings are where people looked, a range
 * is where the creature is.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreatureDetail } from '@/lib/types';
import { MAP_WIDTH } from '@/lib/world-land';
import { RangeMap, WHOLE_WORLD, fitToSightings, type ViewBox } from './RangeMap';
import { CloseIcon, FitIcon, GlobeIcon } from './icons';

type MapOverlayProps = {
  creature: CreatureDetail;
  onClose: () => void;
};

/** Zoomed out past the whole world, or in past a county, is no use to anyone. */
const MIN_WIDTH = 30;

export function MapOverlay({ creature, onClose }: MapOverlayProps) {
  const [view, setView] = useState<ViewBox>(() => fitToSightings(creature.sightings));
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Screen pixels to map coordinates, whatever size or shape the element is. */
  const toMap = useCallback((clientX: number, clientY: number) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  }, []);

  /** Zoom about a fixed place, so whatever is under the pointer stays there. */
  const zoomAt = useCallback((factor: number, anchor: { x: number; y: number } | null) => {
    setView((current) => {
      const w = Math.min(MAP_WIDTH, Math.max(MIN_WIDTH, current.w * factor));
      const scale = w / current.w;
      const at = anchor ?? { x: current.x + current.w / 2, y: current.y + current.h / 2 };
      return {
        x: at.x - (at.x - current.x) * scale,
        y: at.y - (at.y - current.y) * scale,
        w,
        h: current.h * scale,
      };
    });
  }, []);

  /**
   * Wheel and drag are bound by hand rather than through React: onWheel is
   * passive, so it cannot stop the page scrolling underneath the map.
   */
  useEffect(() => {
    const element = svg.current;
    if (!element) return;

    let dragging: { x: number; y: number } | null = null;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(Math.exp(event.deltaY * 0.0015), toMap(event.clientX, event.clientY));
    }

    function onPointerDown(event: PointerEvent) {
      const point = toMap(event.clientX, event.clientY);
      if (!point || !element) return;
      dragging = { x: point.x, y: point.y };
      element.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging) return;
      const point = toMap(event.clientX, event.clientY);
      if (!point) return;
      // The grabbed place should stay under the finger, so the frame moves by
      // however far the map just slid beneath it.
      const grabbed = dragging;
      setView((current) => ({
        ...current,
        x: current.x - (point.x - grabbed.x),
        y: current.y - (point.y - grabbed.y),
      }));
    }

    function onPointerUp(event: PointerEvent) {
      dragging = null;
      element?.releasePointerCapture(event.pointerId);
    }

    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
    };
  }, [zoomAt, toMap]);

  const zoomedOut = view.w >= MAP_WIDTH;

  return (
    <div className="gallery" role="dialog" aria-label={`Where ${creature.name} has been seen`}>
      <div className="gallery-head">
        <span className="name">{creature.name}</span>
        <span className="count">
          {creature.sightings.length.toLocaleString('en-GB')} sightings plotted
        </span>
        {/* Zooming is the wheel's job, and pinching's. The one thing a button
            does better is jumping between the two views worth having. */}
        <button
          type="button"
          className="btn-icon"
          data-tip={zoomedOut ? 'Frame the sightings' : 'See the whole world'}
          aria-label={zoomedOut ? 'Frame the sightings' : 'See the whole world'}
          onClick={() =>
            setView(zoomedOut ? fitToSightings(creature.sightings) : { ...WHOLE_WORLD })
          }
        >
          {zoomedOut ? <FitIcon /> : <GlobeIcon />}
        </button>
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

      <div className="view map-full">
        <RangeMap
          svgRef={svg}
          sightings={creature.sightings}
          view={view}
          dotScale={Math.max(0.5, Math.sqrt(view.w / MAP_WIDTH))}
          className="range-map-interactive"
        />

        <p className="map-note">
          Scroll or pinch to zoom, drag to move. Every dot is a sighting somebody logged on
          iNaturalist — so this is a map of where people went looking as much as of where this
          creature lives. Roads, cities and holidays show up in it; oceans and deserts are emptier
          than the truth.
        </p>

        {creature.rangeMapUrl ? (
          <figure className="range-figure">
            <figcaption>Drawn range — where it actually lives</figcaption>
            <img src={creature.rangeMapUrl} alt={`Range map of ${creature.name}`} />
            <span className="range-credit">
              Range map from{' '}
              <a href={creature.rangeMapUrl} target="_blank" rel="noreferrer noopener">
                Wikimedia Commons
              </a>
            </span>
          </figure>
        ) : null}
      </div>
    </div>
  );
}

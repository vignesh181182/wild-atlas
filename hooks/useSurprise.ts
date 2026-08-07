'use client';

/**
 * Today's surprise: one creature, and it waits. Saving it into a group or
 * discarding it settles it; the next one arrives the day after that. A
 * surprise nobody got round to is never quietly replaced.
 *
 * That makes the offer per-browser state rather than a function of the date,
 * so localStorage keeps both the position in the creature list and the day the
 * current one was settled.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchCreature } from '@/lib/api-client';
import {
  firstSurpriseCursor,
  nextSurpriseCursor,
  surpriseTaxonIdAt,
  todayKey,
} from '@/lib/surprise';
import type { CreatureDetail } from '@/lib/types';
import { primeCreatureCache } from './useCreature';

const STORAGE_KEY = 'wild-atlas:surprise:v2';

type Stored = {
  /** Position in the creature list — which surprise is on offer. */
  cursor: number;
  /** UTC day this one arrived. */
  servedOn: string;
  /** UTC day it was saved or discarded; null while it is still waiting. */
  settledOn: string | null;
};

function read(): Stored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.cursor !== 'number' || typeof parsed.servedOn !== 'string') return null;
    return {
      cursor: parsed.cursor,
      servedOn: parsed.servedOn,
      settledOn: typeof parsed.settledOn === 'string' ? parsed.settledOn : null,
    };
  } catch {
    return null;
  }
}

function write(state: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Not worth failing over — the surprise just won't survive a reload.
  }
}

/**
 * What is on offer now: a first surprise for a browser that has never been
 * here, the next one along if the stored one was settled on an earlier day,
 * and otherwise the stored one, untouched — however long it has been waiting.
 */
export function surpriseNow(stored: Stored | null, today: string): Stored {
  if (!stored) return { cursor: firstSurpriseCursor(), servedOn: today, settledOn: null };
  if (stored.settledOn !== null && stored.settledOn < today) {
    return { cursor: nextSurpriseCursor(stored.cursor), servedOn: today, settledOn: null };
  }
  return stored;
}

export type Surprise = {
  creature: CreatureDetail | null;
  loading: boolean;
  error: string | null;
  /** True once this surprise has been saved or discarded. */
  settled: boolean;
  /** Marks it saved-or-discarded, which is what lets the next one arrive. */
  settle: () => void;
};

export function useSurprise(): Surprise {
  const [stored, setStored] = useState<Stored | null>(null);
  const [creature, setCreature] = useState<CreatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read on mount rather than during render, so the server and the first
  // client render agree and React doesn't complain about a hydration mismatch.
  useEffect(() => {
    setStored(surpriseNow(read(), todayKey()));
  }, []);

  useEffect(() => {
    if (stored) write(stored);
  }, [stored]);

  const taxonId = stored ? surpriseTaxonIdAt(stored.cursor) : null;

  useEffect(() => {
    if (taxonId === null) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchCreature(taxonId, controller.signal)
      .then((data) => {
        // The reader is about to be looking straight at this.
        primeCreatureCache(data);
        setCreature(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Today's surprise is unavailable.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [taxonId]);

  const settle = useCallback(() => {
    setStored((prev) =>
      prev && prev.settledOn === null ? { ...prev, settledOn: todayKey() } : prev,
    );
  }, []);

  return {
    creature,
    loading,
    error,
    settled: stored?.settledOn != null,
    settle,
  };
}

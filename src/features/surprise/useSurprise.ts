'use client';

/**
 * Today's surprise: one creature, and it waits. Saving it into a group or
 * discarding it settles it; the next one arrives the day after that. A
 * surprise nobody got round to is never quietly replaced.
 *
 * That makes the offer per-person state rather than a function of the date,
 * so localStorage — keyed per account, like the library — keeps both the
 * position in the creature list and the day the current one was settled.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchCreature } from '@/lib/api-client';
import {
  firstSurpriseCursor,
  nextSurpriseCursor,
  surpriseTaxonIdAt,
  todayKey,
} from '@/features/surprise/surprise';
import type { CreatureDetail } from '@/lib/types';
import { primeCreatureCache } from '@/features/creatures/useCreature';

const STORAGE_PREFIX = 'wild-atlas:surprise:v2';

type Stored = {
  /** Position in the creature list — which surprise is on offer. */
  cursor: number;
  /** UTC day this one arrived. */
  servedOn: string;
  /** UTC day it was saved or discarded; null while it is still waiting. */
  settledOn: string | null;
};

function read(key: string): Stored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
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

function write(key: string, state: Stored) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Not worth failing over — the surprise just won't survive a reload.
  }
}

/**
 * What is on offer now: a first surprise for an account that has never been
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

/**
 * @param accountId the signed-in user's id, or null while that is still being
 *   established — nobody's surprise is on offer until we know whose it is.
 */
export function useSurprise(accountId: string | null): Surprise {
  const key = accountId ? `${STORAGE_PREFIX}:${accountId}` : null;

  const [stored, setStored] = useState<Stored | null>(null);
  /** Which key `stored` came from — it lags `key` by one effect. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [creature, setCreature] = useState<CreatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read after mount rather than during render, so the server and the first
  // client render agree and React doesn't complain about a hydration mismatch.
  useEffect(() => {
    if (!key) return;
    setStored(surpriseNow(read(key), todayKey()));
    setLoadedKey(key);
  }, [key]);

  // Between accounts `stored` still holds the previous one's surprise, so
  // nothing is read or written until the two keys line up again.
  const ready = key !== null && loadedKey === key;

  useEffect(() => {
    if (ready && key && stored) write(key, stored);
  }, [stored, ready, key]);

  const taxonId = ready && stored ? surpriseTaxonIdAt(stored.cursor) : null;

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
    settled: ready && stored?.settledOn != null,
    settle,
  };
}

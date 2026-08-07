'use client';

import { useEffect, useState } from 'react';
import { fetchCreature } from '@/lib/api-client';
import type { CreatureDetail } from '@/lib/types';

/**
 * Creature pages don't change minute to minute, and the user moves back and
 * forth between results and detail constantly — so keep what we've already
 * fetched for the life of the tab.
 */
const cache = new Map<number, CreatureDetail>();

export type Async<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useCreature(id: number | null): Async<CreatureDetail> {
  const [state, setState] = useState<Async<CreatureDetail>>(() => ({
    data: id !== null ? (cache.get(id) ?? null) : null,
    loading: id !== null && !cache.has(id),
    error: null,
  }));

  useEffect(() => {
    if (id === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const cached = cache.get(id);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetchCreature(id, controller.signal)
      .then((creature) => {
        cache.set(id, creature);
        setState({ data: creature, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Could not load this creature.',
        });
      });

    return () => controller.abort();
  }, [id]);

  return state;
}

/** Lets the surprise route seed the same cache the detail view reads from. */
export function primeCreatureCache(creature: CreatureDetail) {
  cache.set(creature.id, creature);
}

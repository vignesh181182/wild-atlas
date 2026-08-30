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

/**
 * Fetches already on their way, so that two components asking for the same
 * creature at the same moment make one request between them rather than two.
 * The result cache above only helps once an answer is back; until then every
 * caller misses it and goes to the network. The surprise screen and the detail
 * view mount together and want the same creature, which is exactly that case.
 */
const inFlight = new Map<number, Promise<CreatureDetail>>();

export function loadCreature(id: number): Promise<CreatureDetail> {
  const already = inFlight.get(id);
  if (already) return already;
  // No abort signal: the request is shared, and one component unmounting must
  // not cancel it for whoever else is still waiting on it.
  const request = fetchCreature(id)
    .then((creature) => {
      cache.set(creature.id, creature);
      return creature;
    })
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
}

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

    // Abandoned rather than aborted: the request may be shared, so leaving is
    // a matter of no longer listening, not of cancelling it for everyone.
    let listening = true;
    setState({ data: null, loading: true, error: null });

    loadCreature(id)
      .then((creature) => {
        if (listening) setState({ data: creature, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!listening) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Could not load this creature.',
        });
      });

    return () => {
      listening = false;
    };
  }, [id]);

  return state;
}

/**
 * Seeds the cache from a creature fetched some other way. Kept for callers
 * that already hold one; anything still doing the fetching should call
 * `loadCreature`, which shares both the cache and the request.
 */
export function primeCreatureCache(creature: CreatureDetail) {
  cache.set(creature.id, creature);
}

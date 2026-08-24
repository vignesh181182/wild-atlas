'use client';

import { useEffect, useState } from 'react';
import { searchCreatures } from '@/lib/api-client';
import type { CreatureSummary } from '@/lib/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Async } from '@/features/creatures/useCreature';

/**
 * Search-as-you-type. Each new query aborts the one before it, so a slow
 * response for "ele" can never land after the results for "elephant".
 */
export function useSearch(query: string): Async<CreatureSummary[]> {
  const settled = useDebouncedValue(query.trim(), 300);
  const [state, setState] = useState<Async<CreatureSummary[]>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!settled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ data: prev.data, loading: true, error: null }));

    searchCreatures(settled, controller.signal)
      .then((results) => setState({ data: results, loading: false, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Search is unavailable right now.',
        });
      });

    return () => controller.abort();
  }, [settled]);

  return state;
}

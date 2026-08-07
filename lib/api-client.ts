/**
 * Browser-side calls to this app's own API routes. Kept apart from the
 * server-side clients in `inaturalist.ts` / `wikipedia.ts` so it stays obvious
 * which code runs where.
 */

import type { CreatureDetail, CreatureSummary, SearchResponse } from './types';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function searchCreatures(
  query: string,
  signal?: AbortSignal,
): Promise<CreatureSummary[]> {
  const data = await getJson<SearchResponse>(
    `/api/search?q=${encodeURIComponent(query)}`,
    signal,
  );
  return data.results;
}

export function fetchCreature(id: number, signal?: AbortSignal): Promise<CreatureDetail> {
  return getJson<CreatureDetail>(`/api/creature/${id}`, signal);
}

/**
 * iNaturalist API client (https://api.inaturalist.org/v1). Open, no key needed.
 *
 * This module owns two things: talking to iNaturalist, and turning its raw
 * taxon records into the app's own shapes. Nothing above this layer should
 * ever see an `iconic_taxon_name` or a `taxon_photos` array.
 */

import type {
  Ancestor,
  CreatureSummary,
  Photo,
  RegionalStatus,
  Sighting,
  Sound,
} from '@/lib/types';
import {
  conservationLabel,
  isReadableStatus,
  kindLabel,
  rankLabel,
  rankScore,
  titleCase,
} from '@/features/creatures/server/taxonomy';

const API = 'https://api.inaturalist.org/v1';

/**
 * v2 is used for one thing only: it lets a request name the fields it wants.
 * Asking v1 for two hundred sightings hands back thirty-five megabytes of
 * everything; asking v2 for their coordinates hands back twenty kilobytes.
 */
const API_V2 = 'https://api.inaturalist.org/v2';

/** iNaturalist asks that clients identify themselves. */
const HEADERS = { 'User-Agent': 'WildAtlas/0.1 (personal creature encyclopedia)' };

type InatPhoto = {
  url?: string;
  square_url?: string;
  small_url?: string;
  medium_url?: string;
  large_url?: string;
  attribution?: string;
  license_code?: string | null;
};

type InatAncestor = {
  id: number;
  rank: string;
  name: string;
  preferred_common_name?: string;
};

type InatTaxon = {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  iconic_taxon_name?: string;
  extinct?: boolean;
  observations_count?: number;
  default_photo?: InatPhoto | null;
  taxon_photos?: { photo: InatPhoto }[];
  ancestors?: InatAncestor[];
  conservation_status?: { status?: string } | null;
  conservation_statuses?: {
    status?: string;
    authority?: string;
    place?: { name?: string } | null;
  }[];
  wikipedia_url?: string | null;
  wikipedia_summary?: string | null;
  names?: { name: string; locale?: string }[];
  complete_species_count?: number | null;
};

async function inatFetch<T>(path: string, revalidate: number, base = API): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: HEADERS,
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`iNaturalist responded ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

// ── mapping ────────────────────────────────────────────────────────────────

/**
 * The status worth showing is the worldwide IUCN one. `conservation_status` is
 * whichever assessment iNaturalist thought most relevant — often a regional
 * one, and frequently absent — so fall back to the full list and pick the
 * global IUCN entry, which is the one with no `place` attached.
 */
function globalConservationStatus(taxon: InatTaxon): string | null {
  const all = taxon.conservation_statuses ?? [];
  const worldwide = all.filter((entry) => !entry.place);
  const iucn = worldwide.find((entry) => /iucn/i.test(entry.authority ?? ''));
  return iucn?.status ?? worldwide[0]?.status ?? taxon.conservation_status?.status ?? null;
}

function toPhoto(photo: InatPhoto): Photo | null {
  const url = photo.large_url ?? photo.medium_url ?? photo.url;
  if (!url) return null;
  return {
    url,
    thumbUrl: photo.medium_url ?? photo.small_url ?? photo.square_url ?? url,
    attribution: photo.attribution ?? 'iNaturalist',
    licenseCode: photo.license_code ?? null,
  };
}

export function toSummary(taxon: InatTaxon): CreatureSummary {
  return {
    id: taxon.id,
    name: taxon.preferred_common_name ? titleCase(taxon.preferred_common_name) : taxon.name,
    scientificName: taxon.name,
    kind: kindLabel(taxon.iconic_taxon_name),
    rank: taxon.rank,
    extinct: Boolean(taxon.extinct),
    conservationStatus: conservationLabel(globalConservationStatus(taxon)),
    thumbUrl: taxon.default_photo?.medium_url ?? taxon.default_photo?.square_url ?? null,
    observations: taxon.observations_count ?? 0,
  };
}

/** The ranks worth showing, in the order a reader walks down them. */
const MAJOR_RANKS = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'];

/**
 * The lineage as a chain the reader can climb: every step is a real taxon with
 * its own id, so the page can offer to go and look at it.
 */
export function toAncestry(taxon: InatTaxon): Ancestor[] {
  return (taxon.ancestors ?? [])
    .filter((a) => MAJOR_RANKS.includes(a.rank))
    .sort((a, b) => MAJOR_RANKS.indexOf(a.rank) - MAJOR_RANKS.indexOf(b.rank))
    .map((a) => ({
      id: a.id,
      rank: rankLabel(a.rank),
      name: a.name,
      commonName: a.preferred_common_name ? titleCase(a.preferred_common_name) : null,
    }));
}

/**
 * The assessments made for particular countries and regions. `toSummary` keeps
 * only the worldwide one; these are the local pictures behind it, and they are
 * often the more telling half — "least concern globally, endangered here".
 */
export function toRegionalStatuses(taxon: InatTaxon): RegionalStatus[] {
  const seen = new Set<string>();
  return (taxon.conservation_statuses ?? [])
    .flatMap((entry) => {
      const place = entry.place?.name;
      if (!isReadableStatus(entry.status)) return [];
      const status = conservationLabel(entry.status ?? null);
      if (!place || !status || seen.has(place)) return [];
      seen.add(place);
      return [{ place: titleCase(place), status, authority: entry.authority ?? null }];
    })
    .slice(0, 8);
}

export function toPhotos(taxon: InatTaxon): Photo[] {
  const photos = (taxon.taxon_photos ?? [])
    .map((entry) => toPhoto(entry.photo))
    .filter((p): p is Photo => p !== null);

  if (photos.length) return photos;

  const fallback = taxon.default_photo ? toPhoto(taxon.default_photo) : null;
  return fallback ? [fallback] : [];
}

/** Other English names people use — "African Bush Elephant", "Savanna Elephant". */
export function toAlsoCalled(taxon: InatTaxon): string[] {
  const preferred = taxon.preferred_common_name?.toLowerCase();
  const seen = new Set<string>();
  return (taxon.names ?? [])
    .filter((n) => n.locale === 'en')
    .map((n) => titleCase(n.name))
    .filter((name) => {
      const key = name.toLowerCase();
      if (key === preferred || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

// ── search ─────────────────────────────────────────────────────────────────

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Crude singular form, enough to match "elephant" against "Elephants". */
function singular(word: string): string {
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 2 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function tokens(value: string): string[] {
  return normalise(value).split(' ').filter(Boolean).map(singular);
}

/**
 * iNaturalist's own relevance ordering is driven mostly by sighting counts, so
 * a search for "elephant" surfaces a moth and three houseplants before the
 * elephant. We re-rank.
 *
 * The trick that does most of the work: English common names put the head noun
 * last. An "Elephant Hawkmoth" is a hawkmoth; an "African Savanna Elephant" is
 * an elephant. So a query matching the final word counts for far more than one
 * matching the first.
 */
function nameScore(candidate: string, query: string): number {
  if (!candidate) return 0;

  const candidateTokens = tokens(candidate);
  const queryTokens = tokens(query);
  if (!candidateTokens.length || !queryTokens.length) return 0;

  const candidateFlat = candidateTokens.join(' ');
  const queryFlat = queryTokens.join(' ');

  if (candidateFlat === queryFlat) return 120;

  const candidateHead = candidateTokens[candidateTokens.length - 1];
  const queryHead = queryTokens[queryTokens.length - 1];

  let score = 0;
  if (candidateHead === queryHead) score = 90;
  else if (candidateFlat.startsWith(queryFlat)) score = 55;
  else if (candidateTokens.includes(queryHead)) score = 40;
  else if (candidateFlat.includes(queryFlat)) score = 15;

  // Reward having all of the words the user typed, wherever they sit.
  const present = queryTokens.filter((t) => candidateTokens.includes(t)).length;
  score += (present / queryTokens.length) * 30;

  return score;
}

function relevance(taxon: InatTaxon, query: string): number {
  const common = taxon.preferred_common_name ?? '';
  const scientific = taxon.name;

  let score = Math.max(nameScore(common, query), nameScore(scientific, query) * 0.85);
  score += rankScore(taxon.rank) * 4;
  score += Math.log10((taxon.observations_count ?? 0) + 1) * 3;
  if (taxon.default_photo) score += 10;
  if (taxon.preferred_common_name) score += 8;
  return score;
}

export async function searchTaxa(query: string, limit = 12): Promise<CreatureSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const data = await inatFetch<{ results: { record: InatTaxon }[] }>(
    `/search?sources=taxa&q=${encodeURIComponent(q)}&per_page=30&locale=en`,
    60 * 60,
  );

  const seen = new Set<number>();
  return data.results
    .map((r) => r.record)
    .filter((taxon) => {
      if (!taxon?.id || seen.has(taxon.id)) return false;
      seen.add(taxon.id);
      return true;
    })
    .sort((a, b) => relevance(b, q) - relevance(a, q))
    .slice(0, limit)
    .map(toSummary);
}

// ── one creature ───────────────────────────────────────────────────────────

export async function fetchTaxon(id: number): Promise<InatTaxon | null> {
  const data = await inatFetch<{ results: InatTaxon[] }>(
    `/taxa/${id}?all_names=true&locale=en`,
    60 * 60 * 24,
  );
  return data.results?.[0] ?? null;
}

/**
 * Where people have logged this creature — not where it lives. iNaturalist is
 * a record of who was looking, so the dots crowd around towns and holidays and
 * thin out over oceans and deserts. The map says as much on its face.
 *
 * Coordinates for threatened species come back deliberately blurred, which is
 * iNaturalist protecting them from collectors; at this zoom it makes no odds.
 */
type SightingPage = {
  total_results?: number;
  results: { geojson?: { coordinates?: [number, number] } | null }[];
};

const SIGHTINGS_PER_PAGE = 200;

/** iNaturalist won't page deeper than ten thousand records into a result set. */
const MAX_PAGE = 50;

function sightingsPage(taxonId: number, page: number): Promise<SightingPage> {
  return inatFetch<SightingPage>(
    `/observations?taxon_id=${taxonId}&quality_grade=research&geo=true` +
      `&per_page=${SIGHTINGS_PER_PAGE}&page=${page}&fields=(geojson:!t)`,
    60 * 60 * 24,
    API_V2,
  );
}

function toSightings(page: SightingPage | null): Sighting[] {
  return (page?.results ?? []).flatMap((observation) => {
    const point = observation.geojson?.coordinates;
    if (!point || point.length !== 2) return [];
    const [lng, lat] = point;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    return [{ lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) }];
  });
}

/** The dots, and how many sightings there were to draw them from. */
export type Sightings = { points: Sighting[]; total: number };

export async function fetchSightings(taxonId: number): Promise<Sightings> {
  try {
    const first = await sightingsPage(taxonId, 1);
    const total = first.total_results ?? 0;

    // The newest two hundred records of a common species are all one season in
    // one hemisphere. Taking the middle and the far end of the pile as well
    // spreads the sample across years and continents for two more requests.
    const lastPage = Math.min(MAX_PAGE, Math.ceil(total / SIGHTINGS_PER_PAGE));
    const spread = [...new Set([Math.round(lastPage / 2), lastPage])].filter((page) => page > 1);

    const rest = await Promise.all(
      spread.map((page) => sightingsPage(taxonId, page).catch(() => null)),
    );

    return { points: [first, ...rest].flatMap(toSightings), total };
  } catch {
    // A map that fails to load should never take the page with it.
    return { points: [], total: 0 };
  }
}

/**
 * Sightings per calendar month, January first. Read as a shape rather than as
 * numbers, this is when the creature is about: the summer bulge of an insect,
 * the winter trough of a hibernator, a migrant's two passing peaks.
 */
export async function fetchMonthlySightings(taxonId: number): Promise<number[]> {
  try {
    const data = await inatFetch<{
      results?: { month_of_year?: Record<string, number> };
    }>(
      `/observations/histogram?taxon_id=${taxonId}&date_field=observed&interval=month_of_year`,
      60 * 60 * 24,
    );
    const months = data.results?.month_of_year;
    if (!months) return [];
    const counts = Array.from({ length: 12 }, (_, i) => months[String(i + 1)] ?? 0);
    return counts.some((n) => n > 0) ? counts : [];
  } catch {
    return [];
  }
}

/**
 * Creatures to look at next, and where they stand in relation to this one:
 * `inside` when this page is a group and they are its members, `alongside`
 * when it is a single creature and they are its nearest cousins.
 */
export type Relatives = {
  group: string;
  members: CreatureSummary[];
  relation: 'inside' | 'alongside';
};

/** The best-photographed, most-recorded species under a taxon. */
async function speciesUnder(taxonId: number, exclude: number): Promise<CreatureSummary[]> {
  const data = await inatFetch<{ results: InatTaxon[] }>(
    `/taxa?taxon_id=${taxonId}&rank=species&per_page=12&order_by=observations_count&locale=en`,
    60 * 60 * 24,
  );
  return data.results
    .filter((candidate) => candidate.id !== exclude && candidate.default_photo)
    .slice(0, 6)
    .map(toSummary);
}

function groupName(taxon: { name: string; preferred_common_name?: string }): string {
  return taxon.preferred_common_name ? titleCase(taxon.preferred_common_name) : taxon.name;
}

/**
 * On a group's page — a genus, a family — what a reader wants is what is in it.
 * On a single creature's, it is the nearest cousins: other species in its
 * genus, or failing that its family, then its order. Climbing one rank at a
 * time keeps the comparison meaningful; the point is to see what makes this
 * one different.
 */
export async function fetchRelatives(taxon: InatTaxon): Promise<Relatives | null> {
  if (taxon.rank !== 'species' && taxon.rank !== 'subspecies') {
    try {
      const members = await speciesUnder(taxon.id, taxon.id);
      if (members.length) return { group: groupName(taxon), members, relation: 'inside' };
    } catch {
      // Fall through and treat it like any other taxon.
    }
  }

  for (const rank of ['genus', 'family', 'order']) {
    const ancestor = (taxon.ancestors ?? []).find((a) => a.rank === rank);
    if (!ancestor) continue;
    try {
      const members = await speciesUnder(ancestor.id, taxon.id);
      // One close relative beats six distant ones, so take whatever this rank
      // offers and only climb when it offers nothing at all.
      if (members.length) {
        return { group: groupName(ancestor), members, relation: 'alongside' };
      }
    } catch {
      // Try the next rank up.
    }
  }
  return null;
}

/**
 * A community recording of the animal, when one exists. Ranked by votes so we
 * get a clean example rather than the most recent upload.
 */
export async function fetchSound(taxonId: number): Promise<Sound | null> {
  try {
    const data = await inatFetch<{
      results: { sounds?: { file_url?: string; attribution?: string }[] }[];
    }>(
      `/observations?taxon_id=${taxonId}&sounds=true&per_page=1&order_by=votes&quality_grade=research`,
      60 * 60 * 24,
    );
    const sound = data.results?.[0]?.sounds?.[0];
    if (!sound?.file_url) return null;
    return { url: sound.file_url, attribution: sound.attribution ?? 'iNaturalist' };
  } catch {
    // A missing recording should never break the page.
    return null;
  }
}

export type { InatTaxon };

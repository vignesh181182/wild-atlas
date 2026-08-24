/**
 * Wikidata fills the gaps the other two sources leave: how big the creature
 * gets, how long it lives, who first described it — and a proper range map,
 * which is a different claim from iNaturalist's sightings. A range map says
 * where the species is; the sightings say where somebody with a phone was.
 *
 * Everything here is optional. Wikidata's coverage is uneven — a well-known
 * whale may have its mass but not its length — so each fact is returned only
 * when it is there, and the page simply omits what is missing.
 */

import type { Stat } from '@/lib/types';

const API = 'https://www.wikidata.org/w/api.php';

const HEADERS = { 'User-Agent': 'WildAtlas/0.1 (personal creature encyclopedia)' };

/** A week: taxonomy and anatomy do not change on a human timescale. */
const REVALIDATE = 60 * 60 * 24 * 7;

// ── the claims we ask for ──────────────────────────────────────────────────

const P_RANGE_MAP = 'P181';
const P_TAXON_NAME = 'P225';
const P_AUTHOR = 'P405'; // a qualifier on P225, not a claim of its own
const P_YEAR = 'P574'; // likewise
const P_LENGTH = 'P2043';
const P_HEIGHT = 'P2048';
const P_WINGSPAN = 'P2050';
const P_MASS = 'P2067';
const P_LIFESPAN = 'P2250';
const P_GESTATION = 'P3063';

/**
 * Unit symbols, so a measurement reads "27.1 m" rather than "27.1 metre". Only
 * the units that turn up on living things — anything else is left unlabelled
 * rather than guessed at.
 */
const UNITS: Record<string, string> = {
  Q11573: 'm',
  Q174728: 'cm',
  Q174789: 'mm',
  Q828224: 'km',
  Q11570: 'kg',
  Q41803: 'g',
  Q3241121: 'mg',
  Q11571: 't',
  Q577: 'years',
  Q5151: 'months',
  Q573: 'days',
  Q23387: 'weeks',
};

type Snak = {
  datavalue?: {
    value:
      | string
      | { id?: string; time?: string; amount?: string; unit?: string; text?: string }
      | number;
  };
};

type Statement = {
  mainsnak?: Snak;
  qualifiers?: Record<string, Snak[]>;
};

type Entity = { claims?: Record<string, Statement[]> };

export type WikidataFacts = {
  /** A rendering of the species' range, from Wikimedia Commons. */
  rangeMapUrl: string | null;
  /** Size, weight, lifespan — whichever of them Wikidata knows. */
  measurements: Stat[];
  /** "Carl Linnaeus, 1758". */
  describedBy: string | null;
};

const EMPTY: WikidataFacts = { rangeMapUrl: null, measurements: [], describedBy: null };

async function wikidata<T>(params: Record<string, string>): Promise<T | null> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params });
  try {
    const res = await fetch(`${API}?${query}`, { headers: HEADERS, next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function stringValue(snak: Snak | undefined): string | null {
  const value = snak?.datavalue?.value;
  return typeof value === 'string' ? value : null;
}

function itemId(snak: Snak | undefined): string | null {
  const value = snak?.datavalue?.value;
  return typeof value === 'object' && value !== null && 'id' in value ? (value.id ?? null) : null;
}

/** Wikidata times look like "+1758-01-01T00:00:00Z"; we only want the year. */
function year(snak: Snak | undefined): string | null {
  const value = snak?.datavalue?.value;
  if (typeof value !== 'object' || value === null || !('time' in value) || !value.time) return null;
  return value.time.match(/^[+-](\d{4})/)?.[1] ?? null;
}

/** "+27.1" with unit Q11573 → "27.1 m"; "+1" with Q577 → "1 year". */
function quantity(statements: Statement[] | undefined): string | null {
  const value = statements?.[0]?.mainsnak?.datavalue?.value;
  if (typeof value !== 'object' || value === null || !('amount' in value) || !value.amount) {
    return null;
  }
  const amount = Number(value.amount);
  if (!Number.isFinite(amount)) return null;

  const rounded = Number(amount.toFixed(2));
  let unit = UNITS[value.unit?.split('/').pop() ?? ''] ?? '';
  if (rounded === 1 && unit.endsWith('s')) unit = unit.slice(0, -1);

  return `${rounded.toLocaleString('en-GB')}${unit ? ` ${unit}` : ''}`;
}

/**
 * The Wikidata item behind a creature, then the handful of facts worth having
 * from it. Two requests at most: one for the claims, and one to put a name to
 * the person who first described the species.
 */
export async function fetchWikidataFacts(entityId: string): Promise<WikidataFacts> {
  const data = await wikidata<{ entities?: Record<string, Entity> }>({
    action: 'wbgetentities',
    ids: entityId,
    props: 'claims',
  });

  const claims = data?.entities?.[entityId]?.claims;
  if (!claims) return EMPTY;

  const rangeMapFile = stringValue(claims[P_RANGE_MAP]?.[0]?.mainsnak);

  const measurements: Stat[] = (
    [
      ['Length', quantity(claims[P_LENGTH])],
      ['Height', quantity(claims[P_HEIGHT])],
      ['Wingspan', quantity(claims[P_WINGSPAN])],
      ['Weight', quantity(claims[P_MASS])],
      ['Lives up to', quantity(claims[P_LIFESPAN])],
      ['Carried for', quantity(claims[P_GESTATION])],
    ] as const
  ).flatMap(([label, value]) => (value ? [{ label, value }] : []));

  // The naming authority hangs off the scientific-name statement as a pair of
  // qualifiers: who, and when.
  const naming = claims[P_TAXON_NAME]?.[0]?.qualifiers;
  const authorId = itemId(naming?.[P_AUTHOR]?.[0]);
  const namedIn = year(naming?.[P_YEAR]?.[0]);
  const author = authorId ? await fetchLabel(authorId) : null;

  return {
    rangeMapUrl: rangeMapFile
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          rangeMapFile,
        )}?width=1200`
      : null,
    measurements,
    describedBy: [author, namedIn].filter(Boolean).join(', ') || null,
  };
}

async function fetchLabel(entityId: string): Promise<string | null> {
  const data = await wikidata<{
    entities?: Record<string, { labels?: { en?: { value?: string } } }>;
  }>({ action: 'wbgetentities', ids: entityId, props: 'labels', languages: 'en' });
  return data?.entities?.[entityId]?.labels?.en?.value ?? null;
}

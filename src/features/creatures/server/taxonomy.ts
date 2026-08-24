/**
 * Vocabulary translation: iNaturalist speaks in taxonomy codes, the app
 * speaks plain English. Everything that turns one into the other lives here.
 */

/** iNaturalist's eleven "iconic taxa" — the top-level buckets it sorts life into. */
const KIND_BY_ICONIC_TAXON: Record<string, string> = {
  Animalia: 'Animal',
  Amphibia: 'Amphibian',
  Arachnida: 'Arachnid',
  Aves: 'Bird',
  Chromista: 'Chromist',
  Fungi: 'Fungus',
  Insecta: 'Insect',
  Mammalia: 'Mammal',
  Mollusca: 'Mollusc',
  Plantae: 'Plant',
  Protozoa: 'Protozoan',
  Reptilia: 'Reptile',
  Actinopterygii: 'Fish',
  Elasmobranchii: 'Fish',
};

export function kindLabel(iconicTaxonName: string | null | undefined): string {
  if (!iconicTaxonName) return 'Living thing';
  return KIND_BY_ICONIC_TAXON[iconicTaxonName] ?? iconicTaxonName;
}

/** IUCN Red List codes as they appear in iNaturalist's `conservation_status.status`. */
const IUCN_LABELS: Record<string, string> = {
  ne: 'Not evaluated',
  dd: 'Too little known',
  lc: 'Least concern',
  nt: 'Near threatened',
  vu: 'Vulnerable',
  en: 'Endangered',
  cr: 'Critically endangered',
  ew: 'Extinct in the wild',
  ex: 'Extinct',
};

export function conservationLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return IUCN_LABELS[status.toLowerCase()] ?? status.toUpperCase();
}

/**
 * Regional bodies each keep their own scale — NatureServe's "S3", the Russian
 * Red Book's "3-НД-II". They mean something to a specialist and nothing to a
 * reader, so a regional assessment is only shown when it is written in the
 * IUCN wording everyone else on the page is using.
 */
export function isReadableStatus(status: string | null | undefined): boolean {
  return Boolean(status && status.toLowerCase() in IUCN_LABELS);
}

/**
 * How specific a taxon is. Used to rank search results: someone typing
 * "elephant" wants the animal, not the subtribe of daisies that shares the word.
 */
const RANK_SPECIFICITY: Record<string, number> = {
  subspecies: 10,
  variety: 9,
  species: 10,
  genus: 6,
  subgenus: 5,
  family: 4,
  subfamily: 3,
  tribe: 2,
  subtribe: 1,
  superfamily: 2,
  order: 3,
  suborder: 2,
  class: 3,
  subclass: 2,
  phylum: 2,
  kingdom: 2,
};

export function rankScore(rank: string | null | undefined): number {
  if (!rank) return 0;
  return RANK_SPECIFICITY[rank.toLowerCase()] ?? 1;
}

/** Words a title leaves alone unless they open it — "Narwhals and Belugas". */
const MINOR_WORDS = /^(and|or|of|the|in|on|to|for|with|from|at|by|de|von)$/i;

/**
 * iNaturalist common names arrive inconsistently cased — "African Savanna
 * Elephant" but also "coast redwood". Capitalise word starts only, so
 * "elephant's ear" doesn't become "Elephant'S Ear", and leave the joining
 * words in lower case the way a book title would.
 */
export function titleCase(value: string): string {
  return value.replace(
    /(^|[\s\-–—(/])(\p{Ll}[\p{Ll}\p{N}]*)/gu,
    (match, before: string, word: string, offset: number) => {
      if (offset > 0 && MINOR_WORDS.test(word)) return match;
      return before + word.charAt(0).toUpperCase() + word.slice(1);
    },
  );
}

/** "species" → "Species", "subspecies" → "Subspecies". */
export function rankLabel(rank: string): string {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

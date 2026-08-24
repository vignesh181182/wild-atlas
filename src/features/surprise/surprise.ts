/**
 * "Today's surprise" — one creature at a time, waiting until the reader saves
 * it or discards it. Only then does the next one arrive, the following day.
 *
 * Because a surprise can sit unclaimed for days, which creature is on offer is
 * a position in this list rather than a function of the date; the browser keeps
 * that position (see hooks/useSurprise). The list is a hand-picked set of
 * iNaturalist taxon IDs, chosen because each one has good photographs and a
 * substantial Wikipedia article.
 */

export const SURPRISE_TAXON_IDS: number[] = [
  43694, // African savanna elephant
  41553, // Blue whale
  3820, // Emperor penguin
  48662, // Monarch butterfly
  52666, // Venus flytrap
  39449, // Komodo dragon
  339939, // Tyrannosaurus rex
  317775, // Woolly mammoth
  2713, // Dodo
  50873, // Great white shark
  47372, // Coast redwood
  26777, // Axolotl
  74831, // Snow leopard
  41659, // Giant panda
  43236, // Platypus
  41459, // Narwhal
  4647, // Peregrine falcon
  49315, // Common octopus
  47219, // Western honey bee
  61284, // Leafcutter ants
  124337, // Tardigrades
  32873, // Veiled chameleon
  42069, // Red fox
  41521, // Orca
  57983, // Common sunflower
  54449, // Saguaro
  5305, // Bald eagle
  6432, // Ruby-throated hummingbird
  49105, // Leafy seadragon
  48332, // True jellies
  75083, // Ground pangolin
  47067, // Brown-throated three-toed sloth
  41943, // Meerkat
  20980, // Poison dart frogs
  53905, // European mantis
  59567, // Giant sequoia
  41955, // Cheetah
  233598, // Arctic fox
  4503, // Puffins
  623965, // Reef manta ray
  41860, // Sea otter
  47731, // Fireflies
  43577, // Chimpanzee
  1453439, // Red kangaroo
  52775, // Bumble bees
  20413, // Barn owls
  62194, // Titan arum
  48715, // Fly agaric
  48302, // Atlantic horseshoe crab
  47792, // Dragonflies and damselflies
];

/** Days since the Unix epoch — the seed that makes the pick stable for a day. */
export function dayIndex(date = new Date()): number {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(utcMidnight / 86_400_000);
}

/**
 * How far down the list each new surprise steps. The stride is coprime with
 * the list length, so consecutive surprises land far apart instead of walking
 * the list in order, and nothing repeats until every creature has had a turn.
 */
const STRIDE = 21;

/**
 * Where a browser starts: keyed to the day of its first visit, so two people
 * arriving on different days don't work through the list in lockstep.
 */
export function firstSurpriseCursor(date = new Date()): number {
  return (dayIndex(date) * STRIDE) % SURPRISE_TAXON_IDS.length;
}

/** The next surprise along, once the current one has been settled. */
export function nextSurpriseCursor(cursor: number): number {
  return (cursor + STRIDE) % SURPRISE_TAXON_IDS.length;
}

/** The creature at a cursor — tolerant of a stored value that has gone astray. */
export function surpriseTaxonIdAt(cursor: number): number {
  const length = SURPRISE_TAXON_IDS.length;
  const index = ((Math.trunc(cursor) % length) + length) % length;
  return SURPRISE_TAXON_IDS[index];
}

/**
 * Date key ("2026-08-06") in UTC — one clock everywhere, so "settled today,
 * so the next one comes tomorrow" means the same thing in every timezone.
 */
export function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

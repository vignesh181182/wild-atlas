/**
 * Shared shapes for everything the app moves between the server routes, the
 * views and the store. Deliberately flat and JSON-safe: a saved creature is
 * kept verbatim, so these types are also the storage schema.
 */

export type Photo = {
  url: string;
  thumbUrl: string;
  /** iNaturalist requires the photographer credit to travel with the photo. */
  attribution: string;
  licenseCode: string | null;
};

export type Sound = {
  url: string;
  attribution: string;
};

export type Stat = {
  label: string;
  value: string;
};

export type Fact = {
  n: string;
  text: string;
};

/** One step of the lineage, with the id needed to go and look at it. */
export type Ancestor = {
  id: number;
  /** "Class", "Family" — already in reader's words. */
  rank: string;
  /** The scientific name: "Mammalia". */
  name: string;
  /** "Mammals", when there is one. */
  commonName: string | null;
};

/** How one country or region rates the creature's chances. */
export type RegionalStatus = {
  place: string;
  status: string;
  authority: string | null;
};

/** One logged sighting, reduced to a dot on the map. */
export type Sighting = {
  lat: number;
  lng: number;
};

/** A chapter of the Wikipedia article. */
export type ArticleSection = {
  heading: string;
  paragraphs: string[];
};

/** What a search result / library row needs. Kept small — it is what we persist. */
export type CreatureSummary = {
  id: number;
  /** Common name where one exists, otherwise the scientific name. */
  name: string;
  scientificName: string;
  /** Friendly group: Mammal, Bird, Insect, Plant… */
  kind: string;
  rank: string;
  extinct: boolean;
  /** IUCN wording, e.g. "Endangered". Null when the species is unassessed. */
  conservationStatus: string | null;
  thumbUrl: string | null;
  observations: number;
};

export type CreatureDetail = CreatureSummary & {
  /** Lead paragraphs from Wikipedia, or the iNaturalist blurb as a fallback. */
  about: string;
  facts: Fact[];
  /** How many species this taxon contains, when it is a group rather than one. */
  speciesInGroup: number | null;
  /** Size, weight and lifespan, from Wikidata. Often partial, sometimes empty. */
  measurements: Stat[];
  /** "Carl Linnaeus, 1758", when Wikidata knows who named it. */
  describedBy: string | null;
  /** Kingdom down to genus, each step walkable. */
  ancestry: Ancestor[];
  /** Country and region assessments behind the worldwide one. */
  regionalStatuses: RegionalStatus[];
  /** Where people have logged it — observer-biased, and labelled as such. */
  sightings: Sighting[];
  /** How many locatable sightings exist, of which `sightings` is a sample. */
  sightingsTotal: number;
  /** Sightings per calendar month, January first. Empty when unknown. */
  months: number[];
  /** A drawn range map from Wikimedia Commons — where it actually lives. */
  rangeMapUrl: string | null;
  /** Other species in the nearest shared group. */
  relatives: CreatureSummary[];
  /** The name of the group those relatives share. */
  relativesGroup: string | null;
  /** Whether they sit inside this group, or alongside this creature. */
  relativesRelation: 'inside' | 'alongside';
  /** The rest of the Wikipedia article, chapter by chapter. */
  sections: ArticleSection[];
  photos: Photo[];
  sound: Sound | null;
  alsoCalled: string[];
  wikipediaUrl: string | null;
  inaturalistUrl: string;
  /** Where `about` and `facts` came from, for the credit line. */
  aboutSource: 'wikipedia' | 'inaturalist' | null;
};

export type SearchResponse = { results: CreatureSummary[] };

/** A creature the user chose to keep, plus the groups they filed it under. */
export type SavedCreature = {
  creature: CreatureSummary;
  groups: string[];
  savedAt: number;
};

export type LibraryState = {
  groups: string[];
  saved: SavedCreature[];
};

export type View = 'surprise' | 'quiet' | 'results' | 'detail' | 'library';

/* ── what a profile holds ─────────────────────────────────────────────── */

/**
 * A saved creature as the store holds it: membership by group id.
 *
 * `SavedCreature` above is the same thing as the views want it — membership by
 * group *name*, because that is what a reader picked and what the sidebar
 * prints. The two are deliberately separate: names are the reader's handle and
 * change under them, ids are what the store keys on and never move.
 * `useLibrary` is where one becomes the other.
 */
export type StoredCreature = {
  creature: CreatureSummary;
  groupIds: string[];
  savedAt: number;
};

/**
 * A group has an id of its own rather than being known by its name. Renaming
 * is then one write, instead of rewriting every creature that sits in it, and
 * two people can hold groups of the same name without colliding.
 */
export type Group = {
  id: string;
  name: string;
  /** Epoch millis, so it survives JSON. */
  createdAt: number;
};

/** One search a reader ran, kept against their profile. */
export type SearchRecord = {
  id: string;
  query: string;
  at: number;
  /** How many results came back, for spotting searches that found nothing. */
  resultCount: number | null;
};

/** Which daily surprise a reader is on, and whether they have dealt with it. */
export type SurpriseState = {
  cursor: number;
  /** UTC day this one arrived. */
  servedOn: string;
  /** UTC day it was saved or discarded; null while it is still waiting. */
  settledOn: string | null;
};

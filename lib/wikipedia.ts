/**
 * Wikipedia is where the readable prose comes from. iNaturalist gives us a
 * taxon and a Wikipedia link; this module turns that link into the "About
 * them" paragraph and the three "Amazing facts".
 *
 * Everything here is quoted from the article rather than written by us — the
 * facts are real sentences pulled from further down the page, and the UI
 * credits Wikipedia for both.
 */

const API = 'https://en.wikipedia.org/w/api.php';

const HEADERS = { 'User-Agent': 'WildAtlas/0.1 (personal creature encyclopedia)' };

/** Sections that are housekeeping rather than natural history. */
const SKIPPED_SECTIONS =
  /^(references|external links|see also|notes|further reading|bibliography|sources|citations|gallery)$/i;

/**
 * Sections that are *about the article* rather than about the animal. They are
 * full of well-formed sentences listing who named what in which year, which
 * make dreadful facts. Used only if the good sections can't fill the strip.
 */
const DRY_SECTIONS =
  /^(taxonomy|etymology|naming|nomenclature|systematics|classification|phylogeny|evolution|fossil record|research|study|history|discovery|synonyms?)\b/i;

import type { ArticleSection } from './types';

export type WikipediaArticle = {
  title: string;
  /** The lead section — what the article opens with. */
  lead: string;
  /** Standalone sentences drawn from the body, for the facts strip. */
  highlights: string[];
  /** The body, chapter by chapter: description, behaviour, diet, breeding… */
  sections: ArticleSection[];
  /** The article's Wikidata item, which is where the measurements live. */
  entityId: string | null;
  url: string;
};

/** How much of a section to keep, and how many sections. Whole paragraphs only. */
const SECTION_CHARS = 1500;
const MAX_SECTIONS = 6;

type Block = { level: number; heading: string; body: string };

/** `explaintext` renders headings as "== Title ==" on their own lines. */
function toBlocks(extract: string): { lead: string; blocks: Block[] } {
  const [leadRaw, ...rest] = extract.split(/\n(?==+ .+ =+\n)/);
  const blocks = rest.map((section) => {
    const marks = section.match(/^(=+) (.+?) =+$/m);
    return {
      level: marks?.[1]?.length ?? 2,
      heading: (marks?.[2] ?? '').trim(),
      body: section.replace(/^=+ .+? =+$/gm, ' ').trim(),
    };
  });
  return { lead: leadRaw.trim(), blocks };
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    // Drop the stubs left by tables and bullet lists, which read as debris.
    .filter((line) => line.length > 80);
}

/**
 * The article's chapters, in the order it tells them. Subsections are folded
 * into their parent — "Diet" and "Hunting" both belong under "Behaviour", and
 * a reader opening one wants both.
 */
function toSections(blocks: Block[]): ArticleSection[] {
  const sections: ArticleSection[] = [];
  let current: ArticleSection | null = null;

  for (const block of blocks) {
    if (SKIPPED_SECTIONS.test(block.heading)) {
      current = null;
      continue;
    }
    if (block.level <= 2) {
      current = { heading: block.heading, paragraphs: [] };
      sections.push(current);
    }
    if (!current) continue;
    current.paragraphs.push(...paragraphs(block.body));
  }

  return sections
    .map((section) => {
      const kept: string[] = [];
      let length = 0;
      for (const paragraph of section.paragraphs) {
        if (kept.length && length + paragraph.length > SECTION_CHARS) break;
        kept.push(paragraph);
        length += paragraph.length;
      }
      return { ...section, paragraphs: kept };
    })
    .filter((section) => section.paragraphs.join('').length > 200)
    .slice(0, MAX_SECTIONS);
}

/**
 * iNaturalist stores links like `.../wiki/Loxodonta africana` — a real space,
 * not an underscore — so the segment needs normalising before we ask the API.
 */
export function titleFromUrl(wikipediaUrl: string): string | null {
  try {
    const path = new URL(wikipediaUrl).pathname;
    const segment = path.split('/wiki/')[1];
    if (!segment) return null;
    return decodeURIComponent(segment).replace(/ /g, '_');
  } catch {
    return null;
  }
}

function splitSentences(text: string): string[] {
  // Split on sentence enders followed by whitespace and a capital letter.
  // Decimals ("3.04 m") survive because they have no space after the point.
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Openers that only make sense if you have just read the sentence before —
 * pronouns, ordinals, and discourse connectives. A fact card has no "before",
 * so these are unusable however interesting the sentence is.
 */
const ANAPHORIC_OPENER =
  /^(it|its|they|their|them|this|these|those|he|she|his|her|both|such|another|other|others|the (first|second|third|latter|former|same|other)|however|also|additionally|moreover|meanwhile|then|there|although|similarly|conversely|instead|nevertheless|thus|hence|therefore|in (contrast|addition|particular|this|these|that|those|the (same|latter|former)))\b/i;

/**
 * A good "amazing fact" is a complete, self-contained sentence: long enough to
 * say something, short enough to read in a card, and not a stub of markup.
 */
function isGoodHighlight(sentence: string): boolean {
  if (sentence.length < 70 || sentence.length > 260) return false;
  if (sentence.includes('==')) return false;
  if (!/[.!?]$/.test(sentence)) return false;
  if (ANAPHORIC_OPENER.test(sentence)) return false;
  // Skip list dumps and heavy citation residue.
  if ((sentence.match(/,/g)?.length ?? 0) > 4) return false;
  // Skip sentences that open mid-list, e.g. "…toxotis, selousi, peeli, …".
  if (/^\p{Lu}?\p{Ll}+ \p{Ll}+,/u.test(sentence) && /,\s*\p{Ll}+,/u.test(sentence)) return false;
  return true;
}

/** Distinctive words from the creature's names, used to ground a fact. */
function subjectTerms(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[\s(),]+/)
    .filter((word) => word.length > 3);
}

function parseExtract(
  extract: string,
  title: string,
): { lead: string; highlights: string[]; sections: ArticleSection[] } {
  const { lead, blocks } = toBlocks(extract);
  const sections = toSections(blocks);

  const lively: string[] = [];
  const dry: string[] = [];
  for (const block of blocks) {
    if (SKIPPED_SECTIONS.test(block.heading)) continue;
    (DRY_SECTIONS.test(block.heading) ? dry : lively).push(...splitSentences(block.body));
  }

  const livelyUsable = lively.filter(isGoodHighlight);
  const usable =
    livelyUsable.length >= 3 ? livelyUsable : [...livelyUsable, ...dry.filter(isGoodHighlight)];

  // A sentence that names the creature reads as a fact about it; one that
  // doesn't is usually about a place, a researcher or a neighbouring species.
  const terms = subjectTerms(title);
  const grounded = usable.filter((s) => {
    const lower = s.toLowerCase();
    return terms.some((term) => lower.includes(term));
  });
  const candidates = grounded.length >= 3 ? grounded : usable;

  // Spread the picks across the article so the three facts aren't all from
  // the same paragraph.
  const highlights: string[] = [];
  const stride = Math.max(1, Math.floor(candidates.length / 3));
  for (let i = 0; i < candidates.length && highlights.length < 3; i += stride) {
    highlights.push(candidates[i]);
  }

  return { lead, highlights, sections };
}

export async function fetchArticle(wikipediaUrl: string): Promise<WikipediaArticle | null> {
  const title = titleFromUrl(wikipediaUrl);
  if (!title) return null;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'extracts|pageprops',
    ppprop: 'wikibase_item',
    explaintext: '1',
    redirects: '1',
    titles: title,
    origin: '*',
  });

  try {
    const res = await fetch(`${API}?${params}`, {
      headers: HEADERS,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      query?: {
        pages?: {
          title: string;
          extract?: string;
          missing?: boolean;
          pageprops?: { wikibase_item?: string };
        }[];
      };
    };
    const page = data.query?.pages?.[0];
    if (!page || page.missing || !page.extract) return null;

    const { lead, highlights, sections } = parseExtract(page.extract, page.title);
    if (!lead) return null;

    return {
      title: page.title,
      lead,
      highlights,
      sections,
      entityId: page.pageprops?.wikibase_item ?? null,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    };
  } catch {
    return null;
  }
}

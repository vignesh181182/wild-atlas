/**
 * The one place that assembles a complete creature page out of the two
 * sources: iNaturalist for the taxon, the photographs, the sighting counts and
 * the sound; Wikipedia for the prose.
 */

import type { CreatureDetail } from './types';
import {
  fetchMonthlySightings,
  fetchRelatives,
  fetchSightings,
  fetchSound,
  fetchTaxon,
  toAlsoCalled,
  toAncestry,
  toPhotos,
  toRegionalStatuses,
  toSummary,
  type InatTaxon,
} from './inaturalist';
import { fetchWikidataFacts } from './wikidata';
import { fetchArticle } from './wikipedia';

/** iNaturalist's own summary field is a snippet of HTML. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep the lead readable — the first few paragraphs are the interesting part. */
function trimLead(lead: string, maxChars = 1400): string {
  const paragraphs = lead.split(/\n+/).filter(Boolean);
  let out = '';
  for (const paragraph of paragraphs) {
    if (out && out.length + paragraph.length > maxChars) break;
    out = out ? `${out}\n\n${paragraph}` : paragraph;
  }
  return out;
}

export async function getCreature(id: number): Promise<CreatureDetail | null> {
  const taxon = await fetchTaxon(id);
  if (!taxon) return null;

  // None of these depend on each other, so they all go out at once rather than
  // making the page wait five times over.
  const [article, sound, sightings, months, relatives] = await Promise.all([
    taxon.wikipedia_url ? fetchArticle(taxon.wikipedia_url) : Promise.resolve(null),
    fetchSound(taxon.id),
    fetchSightings(taxon.id),
    fetchMonthlySightings(taxon.id),
    fetchRelatives(taxon),
  ]);

  // Wikidata is reached through the article, so it can only go once we have one.
  const wikidata = article?.entityId ? await fetchWikidataFacts(article.entityId) : null;

  const { about, facts, aboutSource } = buildProse(taxon, article);

  return {
    ...toSummary(taxon),
    about,
    facts,
    speciesInGroup: taxon.complete_species_count ?? null,
    measurements: wikidata?.measurements ?? [],
    describedBy: wikidata?.describedBy ?? null,
    ancestry: toAncestry(taxon),
    regionalStatuses: toRegionalStatuses(taxon),
    sightings: sightings.points,
    sightingsTotal: sightings.total,
    months,
    rangeMapUrl: wikidata?.rangeMapUrl ?? null,
    relatives: relatives?.members ?? [],
    relativesGroup: relatives?.group ?? null,
    relativesRelation: relatives?.relation ?? 'alongside',
    sections: article?.sections ?? [],
    photos: toPhotos(taxon),
    sound,
    alsoCalled: toAlsoCalled(taxon),
    wikipediaUrl: article?.url ?? taxon.wikipedia_url ?? null,
    inaturalistUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
    aboutSource,
  };
}

function buildProse(
  taxon: InatTaxon,
  article: Awaited<ReturnType<typeof fetchArticle>>,
): Pick<CreatureDetail, 'about' | 'facts' | 'aboutSource'> {
  if (article) {
    return {
      about: trimLead(article.lead),
      facts: article.highlights.map((text, i) => ({ n: String(i + 1), text })),
      aboutSource: 'wikipedia',
    };
  }

  if (taxon.wikipedia_summary) {
    return {
      about: stripHtml(taxon.wikipedia_summary),
      facts: [],
      aboutSource: 'inaturalist',
    };
  }

  return {
    about: 'No description has been written for this one yet.',
    facts: [],
    aboutSource: null,
  };
}

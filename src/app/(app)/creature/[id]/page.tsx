/**
 * One creature, at its own address.
 *
 * This is the change the old single-screen app could not make: a creature was
 * state inside a React component, so it could not be linked to, shared, or
 * rendered before JavaScript arrived. Now it is a URL that answers with the
 * page already written.
 *
 * Assembling one costs eight calls to iNaturalist, Wikipedia and Wikidata, and
 * none of it changes hour to hour — so the route is cached the way the API
 * route it replaces was: a day fresh, a week servable while it refreshes.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CreatureScreen } from '@/features/creatures/components/CreatureScreen';
import { getCreature } from '@/features/creatures/server/creatures';
import { FALLBACK_TONE, photoTone } from '@/features/creatures/server/tone';

export const revalidate = 86400;

type Params = { params: Promise<{ id: string }> };

function taxonId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = taxonId((await params).id);
  const creature = id === null ? null : await getCreature(id);
  if (!creature) return { title: 'Not found — Wild Atlas' };

  // What a shared link unfurls into, wherever it is pasted.
  const description = creature.about.slice(0, 200).trim();
  const photo = creature.photos[0]?.url;
  return {
    title: `${creature.name} — Wild Atlas`,
    description,
    openGraph: {
      title: creature.name,
      description,
      images: photo ? [photo] : undefined,
      type: 'article',
    },
  };
}

export default async function CreaturePage({ params }: Params) {
  const id = taxonId((await params).id);
  if (id === null) notFound();

  const creature = await getCreature(id);
  if (!creature) notFound();

  // Sampled here rather than in the browser: the photograph is served from
  // another origin, so a canvas could not read it back, and doing it on the
  // server means it is cached with the rest of the page.
  const photo = creature.photos[0];
  const tone = (photo ? await photoTone(photo.thumbUrl ?? photo.url) : null) ?? FALLBACK_TONE;

  return <CreatureScreen creature={creature} tone={tone} />;
}

import { NextResponse } from 'next/server';
import { getCreature } from '@/lib/creatures';

/**
 * Assembling one creature costs eight calls to iNaturalist, Wikipedia and
 * Wikidata. None of it changes hour to hour, so let the CDN keep the answer:
 * a day fresh, a week servable while it refreshes in the background. A popular
 * creature then costs one function call a day rather than one per visitor.
 */
const CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800';

/** GET /api/creature/43694 — one fully assembled creature page. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const taxonId = Number(id);

  if (!Number.isInteger(taxonId) || taxonId <= 0) {
    return NextResponse.json({ error: 'Not a valid creature id.' }, { status: 400 });
  }

  try {
    const creature = await getCreature(taxonId);
    if (!creature) {
      return NextResponse.json({ error: 'No creature with that id.' }, { status: 404 });
    }
    return NextResponse.json(creature, { headers: { 'Cache-Control': CACHE } });
  } catch (error) {
    console.error('[api/creature]', error);
    return NextResponse.json({ error: 'Could not load this creature.' }, { status: 502 });
  }
}

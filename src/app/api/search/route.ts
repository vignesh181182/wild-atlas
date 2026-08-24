import { NextResponse } from 'next/server';
import { searchTaxa } from '@/features/creatures/server/inaturalist';

/**
 * GET /api/search?q=elephant&limit=12
 *
 * Proxying iNaturalist through our own route keeps the ranking rules on the
 * server and lets the CDN answer identical queries for everyone else — the
 * same few hundred creatures get typed over and over.
 */
const CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(searchParams.get('limit')) || 12, 30);

  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchTaxa(q, limit);
    return NextResponse.json({ results }, { headers: { 'Cache-Control': CACHE } });
  } catch (error) {
    console.error('[api/search]', error);
    return NextResponse.json({ error: 'Search is unavailable right now.' }, { status: 502 });
  }
}

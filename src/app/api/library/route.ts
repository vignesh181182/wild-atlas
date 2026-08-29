/**
 * GET  /api/library — everything this reader has kept.
 * POST /api/library — adopt the notebook a browser was holding on its own.
 *
 * One route for the whole library rather than one per collection: the sidebar
 * wants the groups and their counts in the same breath, and two round trips to
 * draw one menu is a waste of the reader's time.
 */

import { json, withUser } from '@/server/api';
import { adoptNotebook, ensureProfile, listSaved } from '@/server/profile';
import type { CreatureSummary, LibraryState, LibrarySnapshot, SavedCreature } from '@/lib/types';

async function snapshot(userId: string): Promise<LibrarySnapshot> {
  // A first visit has its profile created here, so every route below can
  // assume one exists rather than each checking for itself. It starts with no
  // groups: what a reader wants, they make.
  const [groups, saved] = await Promise.all([ensureProfile(userId), listSaved(userId)]);
  return { groups, saved };
}

export async function GET() {
  return withUser(async (userId) => json(await snapshot(userId)));
}

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const notebook = readNotebook(await request.json().catch(() => null));
    if (!notebook) return json({ error: 'That is not a library.' }, 400);

    const adopted = await adoptNotebook(userId, notebook);
    return json({ adopted, ...(await snapshot(userId)) });
  });
}

/**
 * The browser's own copy, taken apart and rebuilt rather than trusted whole.
 * It is only ever this reader's own shelf, so nothing here is a way into
 * anyone else's — but a document is not the place to let unknown fields in,
 * and a creature is a known shape.
 */
function readNotebook(body: unknown): LibraryState | null {
  if (!body || typeof body !== 'object') return null;
  const { groups, saved } = body as Partial<LibraryState>;
  if (!Array.isArray(groups) || !Array.isArray(saved)) return null;

  const rows = saved
    .map((row) => readRow(row))
    .filter((row): row is SavedCreature => row !== null);

  return { groups: groups.filter((g): g is string => typeof g === 'string'), saved: rows };
}

function readRow(row: unknown): SavedCreature | null {
  if (!row || typeof row !== 'object') return null;
  const { creature, groups, savedAt } = row as Partial<SavedCreature>;
  if (!creature || typeof creature !== 'object' || !Array.isArray(groups)) return null;
  if (typeof creature.id !== 'number' || !Number.isFinite(creature.id)) return null;

  const summary: CreatureSummary = {
    id: creature.id,
    name: String(creature.name ?? ''),
    scientificName: String(creature.scientificName ?? ''),
    kind: String(creature.kind ?? ''),
    rank: String(creature.rank ?? ''),
    extinct: Boolean(creature.extinct),
    conservationStatus: creature.conservationStatus ? String(creature.conservationStatus) : null,
    thumbUrl: creature.thumbUrl ? String(creature.thumbUrl) : null,
    observations: Number(creature.observations) || 0,
  };

  return {
    creature: summary,
    groups: groups.filter((g): g is string => typeof g === 'string'),
    savedAt: Number(savedAt) || Date.now(),
  };
}

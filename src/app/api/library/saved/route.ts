/**
 * POST /api/library/saved — put a creature in a group, or take it out again.
 *
 * One route for both directions, because that is the one gesture the reader
 * makes: the Save menu's rows are checkboxes, and which way a tap goes is a
 * question about what is already filed. The store settles that in a
 * transaction and says which it did, so two quick taps cannot both read
 * "not saved" and file the same creature twice.
 */

import { json, withUser } from '@/server/api';
import { toggleSave } from '@/server/profile';
import type { CreatureSummary } from '@/lib/types';

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const body = (await request.json().catch(() => null)) as {
      creature?: CreatureSummary;
      groupId?: unknown;
    } | null;

    const creature = body?.creature;
    const groupId = typeof body?.groupId === 'string' ? body.groupId : '';
    if (!creature || typeof creature.id !== 'number' || !groupId) {
      return json({ error: 'A creature and a group, please.' }, 400);
    }

    const result = await toggleSave(userId, creature, groupId);
    return json({ result });
  });
}

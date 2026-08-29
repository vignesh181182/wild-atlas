/**
 * DELETE /api/library/saved/:taxonId            — forget it entirely.
 * DELETE /api/library/saved/:taxonId?group=:id  — only take it out of that one.
 *
 * The library's two ways of letting go, which read differently to a reader:
 * lifting a creature out of one group leaves it wherever else it sits, and
 * that is the safer of the two, so it is the one that has to be asked for.
 */

import { json, withUser } from '@/server/api';
import { forget, removeFromGroup } from '@/server/profile';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  return withUser(async (userId) => {
    const taxonId = Number((await params).id);
    if (!Number.isFinite(taxonId)) return json({ error: 'Not a creature.' }, 400);

    const group = new URL(request.url).searchParams.get('group');
    if (group) await removeFromGroup(userId, taxonId, group);
    else await forget(userId, taxonId);
    return json({ ok: true });
  });
}

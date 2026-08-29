/**
 * PATCH  /api/library/groups/:id — rename it.
 * DELETE /api/library/groups/:id — and everything filed only in it.
 *
 * Both by id, never by name: a rename is one write this way, and a reader who
 * renames a group twice quickly cannot have the second write land on a name
 * that has already moved on.
 */

import { json, withUser } from '@/server/api';
import { deleteGroup, renameGroup } from '@/server/profile';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return withUser(async (userId) => {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return json({ error: 'A group needs a name.' }, 400);

    await renameGroup(userId, id, name);
    return json({ ok: true });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return withUser(async (userId) => {
    const { id } = await params;
    await deleteGroup(userId, id);
    return json({ ok: true });
  });
}

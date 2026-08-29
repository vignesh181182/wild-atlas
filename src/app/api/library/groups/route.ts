/**
 * POST /api/library/groups — start a new group.
 *
 * Answers with the group the store made, id and all, because the browser
 * cannot invent one: it has been showing the reader a group under a name of
 * its own since the moment they typed it, and this is what it files under.
 */

import { json, withUser } from '@/server/api';
import { addGroup } from '@/server/profile';

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return json({ error: 'A group needs a name.' }, 400);

    const group = await addGroup(userId, name);
    // Taken already — the only way `addGroup` declines.
    if (!group) return json({ error: `“${name}” already exists.` }, 409);
    return json({ group });
  });
}

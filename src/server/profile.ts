/**
 * Everything a reader owns, stored against their Clerk id.
 *
 * This is the only file that knows Firestore's shape. The routes above it deal
 * in the app's own types, so swapping the store later is a rewrite of this
 * file and nothing else — which is exactly the property localStorage lost by
 * being read from inside a hook.
 *
 *   users/{userId}
 *     groups/{groupId}      name, createdAt
 *     saved/{taxonId}       creature, groupIds, savedAt
 *     searches/{searchId}   query, at, resultCount
 *     meta/surprise         cursor, servedOn, settledOn
 *
 * A creature is keyed by its taxon id, so saving the same animal twice updates
 * one document rather than growing a second.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentData, DocumentReference } from 'firebase-admin/firestore';
import { db } from './firestore';
import type {
  CreatureSummary,
  Group,
  LibraryState,
  SearchRecord,
  StoredCreature,
  SurpriseState,
} from '@/lib/types';

/** Kept small on purpose: this is a reading aid, not an audit log. */
const SEARCH_HISTORY_LIMIT = 50;

function user(userId: string) {
  return db().collection('users').doc(userId);
}

/* ── groups ───────────────────────────────────────────────────────────── */

export async function listGroups(userId: string): Promise<Group[]> {
  const snap = await user(userId).collection('groups').orderBy('createdAt').get();
  return snap.docs.map((d) => ({
    id: d.id,
    name: String(d.get('name') ?? ''),
    createdAt: Number(d.get('createdAt') ?? 0),
  }));
}

export async function addGroup(userId: string, name: string): Promise<Group | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = await listGroups(userId);
  // Names are the reader's handle on a group, so two that differ only by case
  // would be indistinguishable in the sidebar.
  if (existing.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) return null;

  const createdAt = Date.now();
  const ref = await user(userId).collection('groups').add({ name: trimmed, createdAt });
  return { id: ref.id, name: trimmed, createdAt };
}

export async function renameGroup(userId: string, groupId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  // One write, wherever the group is used — the point of giving it an id.
  await user(userId).collection('groups').doc(groupId).update({ name: trimmed });
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  const saved = await user(userId)
    .collection('saved')
    .where('groupIds', 'array-contains', groupId)
    .get();

  const batch = db().batch();
  batch.delete(user(userId).collection('groups').doc(groupId));
  for (const doc of saved.docs) {
    const remaining = (doc.get('groupIds') as string[]).filter((id) => id !== groupId);
    // A creature that was only in this group is no longer kept anywhere.
    if (remaining.length === 0) batch.delete(doc.ref);
    else batch.update(doc.ref, { groupIds: remaining });
  }
  await batch.commit();
}

/* ── saved creatures ──────────────────────────────────────────────────── */

export async function listSaved(userId: string): Promise<StoredCreature[]> {
  const snap = await user(userId).collection('saved').orderBy('savedAt', 'desc').get();
  return snap.docs.map((d) => ({
    creature: d.get('creature') as CreatureSummary,
    groupIds: (d.get('groupIds') as string[]) ?? [],
    savedAt: Number(d.get('savedAt') ?? 0),
  }));
}

/**
 * Put a creature in a group, or take it out of one — whichever it was not.
 * Returns what happened so the caller can say so.
 */
export async function toggleSave(
  userId: string,
  creature: CreatureSummary,
  groupId: string,
): Promise<'added' | 'removed'> {
  const ref = user(userId).collection('saved').doc(String(creature.id));

  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, { creature, groupIds: [groupId], savedAt: Date.now() });
      return 'added';
    }
    const groupIds = (doc.get('groupIds') as string[]) ?? [];
    if (groupIds.includes(groupId)) {
      const remaining = groupIds.filter((id) => id !== groupId);
      if (remaining.length === 0) tx.delete(ref);
      else tx.update(ref, { groupIds: remaining });
      return 'removed';
    }
    // Refresh the stored snapshot while we are here, in case the common name
    // or photograph has changed upstream since it was filed.
    tx.update(ref, { creature, groupIds: [...groupIds, groupId] });
    return 'added';
  });
}

export async function removeFromGroup(
  userId: string,
  taxonId: number,
  groupId: string,
): Promise<void> {
  const ref = user(userId).collection('saved').doc(String(taxonId));
  await db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return;
    const remaining = ((doc.get('groupIds') as string[]) ?? []).filter((id) => id !== groupId);
    if (remaining.length === 0) tx.delete(ref);
    else tx.update(ref, { groupIds: remaining });
  });
}

/** Throw the creature away entirely: it leaves every group. */
export async function forget(userId: string, taxonId: number): Promise<void> {
  await user(userId).collection('saved').doc(String(taxonId)).delete();
}

/* ── a notebook that predates the profile ─────────────────────────────── */

/**
 * Take on the library a browser was holding on its own, from before there was
 * a server to keep it in.
 *
 * It only ever seeds an empty profile. If anything is already filed here, the
 * browser's copy is the older story — a machine that was signed in before the
 * change, an abandoned tab — and adopting it would push a stale library over
 * a live one. Returns whether it took, so the browser knows to let go.
 *
 * Groups arrive by name, since names are all the browser ever knew; a name the
 * profile already carries keeps its own id rather than being filed twice.
 */
export async function adoptNotebook(userId: string, notebook: LibraryState): Promise<boolean> {
  if ((await listSaved(userId)).length > 0) return false;

  const groups = await ensureProfile(userId);
  const idByName = new Map(groups.map((g) => [g.name.toLowerCase(), g.id]));

  const writes: Array<[DocumentReference, DocumentData]> = [];

  let createdAt = Date.now();
  for (const name of notebook.groups) {
    const trimmed = name.trim();
    if (!trimmed || idByName.has(trimmed.toLowerCase())) continue;
    const ref = user(userId).collection('groups').doc();
    idByName.set(trimmed.toLowerCase(), ref.id);
    // Spread, so the order they were in is the order they come back in.
    writes.push([ref, { name: trimmed, createdAt: createdAt++ }]);
  }

  for (const row of notebook.saved) {
    const groupIds = row.groups
      .map((name) => idByName.get(name.trim().toLowerCase()))
      .filter((id): id is string => Boolean(id));
    // Nowhere to file it — a group the browser never listed. Dropping it is
    // right: a creature outside every group is not kept by this store.
    if (groupIds.length === 0) continue;
    writes.push([
      user(userId).collection('saved').doc(String(row.creature.id)),
      { creature: row.creature, groupIds, savedAt: row.savedAt },
    ]);
  }

  // A batch takes 500 writes. No reader's notebook comes near that, but the
  // one that did would fail whole, and this is the one chance to keep it.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db().batch();
    for (const [ref, data] of writes.slice(i, i + 400)) batch.set(ref, data);
    await batch.commit();
  }
  return true;
}

/* ── search history ───────────────────────────────────────────────────── */

export async function recordSearch(
  userId: string,
  query: string,
  resultCount: number | null,
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  const searches = user(userId).collection('searches');
  // Search-as-you-type would otherwise file "e", "el", "ele" and "eleph" as
  // four searches. Fold a repeat of the same query into the existing row.
  const same = await searches.where('query', '==', trimmed).limit(1).get();
  if (!same.empty) {
    await same.docs[0].ref.update({ at: Date.now(), resultCount });
    return;
  }
  await searches.add({ query: trimmed, at: Date.now(), resultCount });
}

export async function listSearches(userId: string, limit = 20): Promise<SearchRecord[]> {
  const snap = await user(userId)
    .collection('searches')
    .orderBy('at', 'desc')
    .limit(Math.min(limit, SEARCH_HISTORY_LIMIT))
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    query: String(d.get('query') ?? ''),
    at: Number(d.get('at') ?? 0),
    resultCount: d.get('resultCount') === undefined ? null : Number(d.get('resultCount')),
  }));
}

export async function clearSearches(userId: string): Promise<void> {
  const snap = await user(userId).collection('searches').get();
  const batch = db().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/* ── the daily surprise ───────────────────────────────────────────────── */

export async function readSurprise(userId: string): Promise<SurpriseState | null> {
  const doc = await user(userId).collection('meta').doc('surprise').get();
  if (!doc.exists) return null;
  return {
    cursor: Number(doc.get('cursor') ?? 0),
    servedOn: String(doc.get('servedOn') ?? ''),
    settledOn: (doc.get('settledOn') as string | null) ?? null,
  };
}

export async function writeSurprise(userId: string, state: SurpriseState): Promise<void> {
  await user(userId).collection('meta').doc('surprise').set(state);
}

/* ── first sight of a reader ──────────────────────────────────────────── */

/**
 * Make sure this reader has a profile, and hand back the groups they have.
 *
 * A new shelf starts empty. There were four example groups here once, and
 * they were the first thing a reader saw: folders somebody else had named,
 * waiting to be tidied away. What a reader wants, they make.
 */
export async function ensureProfile(userId: string): Promise<Group[]> {
  const ref = user(userId);
  const [doc, groups] = await Promise.all([ref.get(), listGroups(userId)]);
  // The profile document is the record that this reader exists at all, which
  // is a separate thing from what they have made — and now the only thing
  // written here, since a new shelf starts empty. Read first rather than
  // merging blindly: this runs on every read of the library, and a write on
  // each one would be a write per page view for no gain.
  if (!doc.exists) await ref.set({ createdAt: Date.now(), userId });
  return groups;
}

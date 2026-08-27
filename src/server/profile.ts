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
import { db } from './firestore';
import type {
  CreatureSummary,
  Group,
  SearchRecord,
  StoredCreature,
  SurpriseState,
} from '@/lib/types';

/** Groups a new profile starts with, matching what the app has always shown. */
const STARTER_GROUPS = ['Favourites', 'Ocean trip', 'Dinosaurs', 'School project'];

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
 * Give a brand-new profile the starter groups, once. Returns the groups either
 * way, so a caller can treat first visit and every visit after it alike.
 */
export async function ensureProfile(userId: string): Promise<Group[]> {
  const existing = await listGroups(userId);
  if (existing.length > 0) return existing;

  const createdAt = Date.now();
  const batch = db().batch();
  const groups: Group[] = STARTER_GROUPS.map((name, i) => {
    const ref = user(userId).collection('groups').doc();
    // Spread the timestamps so the ordering is the one written here.
    const at = createdAt + i;
    batch.set(ref, { name, createdAt: at });
    return { id: ref.id, name, createdAt: at };
  });
  batch.set(user(userId), { createdAt, userId }, { merge: true });
  await batch.commit();
  return groups;
}

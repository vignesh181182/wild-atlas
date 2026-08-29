'use client';

/**
 * The saved library: the reader's groups, and which creatures sit in which.
 *
 * The store is the profile on the server — see server/profile.ts — reached
 * through /api/library. That is what makes the library the reader's rather
 * than the browser's: sign in on another machine and the same shelf is there,
 * which localStorage could never do however carefully it was keyed.
 *
 * Changes are made in the reader's hand first and posted after, because a save
 * should feel like a tap and not a round trip. Every request goes through one
 * queue, so a creature filed into a group made a moment ago cannot reach the
 * server before the group does — and if a write fails, the server's copy is
 * read back over the top, so the shelf shows what is actually kept rather than
 * something that only ever existed on screen.
 *
 * A mirror of the last known library is kept in localStorage, per account, so
 * the menu can be drawn on the first frame. It is a cache and nothing else:
 * the server's answer replaces it the moment it lands, and losing it costs a
 * spinner's worth of nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreatureSummary,
  Group,
  LibrarySnapshot,
  LibraryState,
  SavedCreature,
} from '@/lib/types';

/** The last known library, per account, for the first frame. */
const MIRROR_PREFIX = 'wild-atlas:library:mirror:v1';

/**
 * Where the library lived when it lived only in the browser — once per
 * account, and once more from before there were accounts at all. Either is
 * handed to the server the first time a reader arrives with an empty profile,
 * so nobody loses the notebook they built before there was anywhere to keep
 * it. Only cleared once the server says it has taken it.
 */
const LOCAL_PREFIX = 'wild-atlas:library:v1';

/**
 * The pseudo-group behind the sidebar's "All" row: everything kept, whichever
 * group it sits in. Not a real group — it is never stored, renamed or deleted.
 * The leading space keeps it out of reach: `addGroup` trims what the user
 * types, so nothing they create can collide with this name.
 */
export const ALL_GROUP = ' all';

/**
 * A group the reader has made but the store has not answered for yet. It
 * stands in until the real id arrives, and no request is ever sent under one.
 */
const PENDING = 'pending:';

const EMPTY: LibrarySnapshot = { groups: [], saved: [] };

/* ── talking to the profile ───────────────────────────────────────────── */

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api/library${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
}

async function fetchSnapshot(): Promise<LibrarySnapshot | null> {
  const res = await api('').catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as LibrarySnapshot | null;
}

/**
 * The reader's library, and — the first time only — whatever this browser was
 * still holding on its own handed over to the profile.
 */
async function loadLibrary(accountId: string): Promise<LibrarySnapshot | null> {
  const snapshot = await fetchSnapshot();
  if (!snapshot) return null;

  // A profile with something in it is the better copy by definition; the
  // browser's notebook stays where it is rather than being thrown away, in
  // case it is ever wanted.
  if (snapshot.saved.length > 0) return snapshot;

  const local = readLocalNotebook(accountId);
  if (!local) return snapshot;

  const res = await api('', { method: 'POST', body: JSON.stringify(local.notebook) }).catch(
    () => null,
  );
  if (!res?.ok) return snapshot;

  const adopted = (await res.json().catch(() => null)) as (LibrarySnapshot & {
    adopted: boolean;
  }) | null;
  if (!adopted) return snapshot;

  if (adopted.adopted) forget(local.key);
  return { groups: adopted.groups, saved: adopted.saved };
}

/* ── the browser's own copies ─────────────────────────────────────────── */

function readMirror(accountId: string): LibrarySnapshot | null {
  try {
    const raw = window.localStorage.getItem(`${MIRROR_PREFIX}:${accountId}`);
    const parsed = raw ? (JSON.parse(raw) as Partial<LibrarySnapshot>) : null;
    if (!parsed || !Array.isArray(parsed.groups) || !Array.isArray(parsed.saved)) return null;
    return { groups: parsed.groups, saved: parsed.saved };
  } catch {
    return null;
  }
}

function writeMirror(accountId: string, snapshot: LibrarySnapshot) {
  try {
    window.localStorage.setItem(`${MIRROR_PREFIX}:${accountId}`, JSON.stringify(snapshot));
  } catch {
    // A full or blocked storage costs a first-frame menu, nothing more.
  }
}

function readLocalNotebook(accountId: string): { key: string; notebook: LibraryState } | null {
  for (const key of [`${LOCAL_PREFIX}:${accountId}`, LOCAL_PREFIX]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<LibraryState>;
      if (!Array.isArray(parsed.groups) || !Array.isArray(parsed.saved)) continue;
      if (parsed.groups.length === 0 && parsed.saved.length === 0) continue;
      return { key, notebook: { groups: parsed.groups, saved: parsed.saved } };
    } catch {
      // Unreadable is the same as absent.
    }
  }
  return null;
}

function forget(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // It has been adopted either way; leaving it costs a few kilobytes.
  }
}

export type Library = {
  groups: string[];
  saved: SavedCreature[];
  /** True once the server's copy is in hand; before that this is the mirror. */
  ready: boolean;
  groupsOf: (creatureId: number) => string[];
  countIn: (group: string) => number;
  rowsIn: (group: string) => SavedCreature[];
  isSaved: (creatureId: number) => boolean;
  addGroup: (name: string) => boolean;
  renameGroup: (oldName: string, newName: string) => void;
  deleteGroup: (name: string) => void;
  toggleSave: (creature: CreatureSummary, group: string) => 'added' | 'removed';
  removeFromGroup: (creatureId: number, group: string) => void;
  forget: (creatureId: number) => void;
};

/**
 * @param accountId the signed-in reader's id, or null while that is still
 *   being established. Null means we don't know whose library to open yet, so
 *   the hook reports nothing saved rather than guessing.
 */
export function useLibrary(accountId: string | null): Library {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY);
  const [ready, setReady] = useState(false);

  /**
   * The library as it stands this instant. React state lags a render behind,
   * and a queued request needs the ids as they are when it finally goes out,
   * so every read and write below goes through this and the state follows.
   */
  const snap = useRef(snapshot);

  /** Placeholder id → the id the store gave it. See `PENDING`. */
  const settled = useRef(new Map<string, string>());

  const put = useCallback(
    (next: LibrarySnapshot) => {
      snap.current = next;
      setSnapshot(next);
      if (accountId) writeMirror(accountId, next);
    },
    [accountId],
  );

  const update = useCallback(
    (apply: (prev: LibrarySnapshot) => LibrarySnapshot) => put(apply(snap.current)),
    [put],
  );

  useEffect(() => {
    if (!accountId) {
      snap.current = EMPTY;
      setSnapshot(EMPTY);
      setReady(false);
      return;
    }

    // The mirror first, so the menu is on screen this frame rather than after
    // a round trip; the server's copy lands over it a moment later.
    const mirrored = readMirror(accountId);
    snap.current = mirrored ?? EMPTY;
    setSnapshot(snap.current);
    setReady(false);

    let live = true;
    void (async () => {
      const loaded = await loadLibrary(accountId);
      if (!live || !loaded) return;
      settled.current.clear();
      snap.current = loaded;
      setSnapshot(loaded);
      writeMirror(accountId, loaded);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [accountId]);

  const reload = useCallback(async () => {
    const fresh = await fetchSnapshot();
    // Offline, or the store is down: keep what is on screen rather than
    // blanking a library that is only unreachable.
    if (!fresh) return;
    settled.current.clear();
    put(fresh);
  }, [put]);

  const queue = useRef<Promise<void>>(Promise.resolve());

  /**
   * Post one change, behind whatever is already in flight. The order is the
   * whole point: a creature filed into a brand-new group has to reach the
   * server after the group, and its request cannot even be written until the
   * group has an id. Returning null means there is nothing to send.
   */
  const send = useCallback(
    (request: () => Promise<Response | null>) => {
      queue.current = queue.current.then(async () => {
        try {
          const res = await request();
          if (res && !res.ok) throw new Error(`Library write failed: ${res.status}`);
        } catch {
          // Whatever we showed, the store did not take. Its copy wins.
          await reload();
        }
      });
    },
    [reload],
  );

  /** The id a group is known by now — the store's, once it has answered. */
  const idNow = useCallback((id: string) => settled.current.get(id) ?? id, []);

  const idOf = useCallback(
    (name: string) => snap.current.groups.find((g) => g.name === name)?.id ?? null,
    [],
  );

  /* ── what the views read ────────────────────────────────────────────── */

  const nameById = useMemo(
    () => new Map(snapshot.groups.map((g) => [g.id, g.name])),
    [snapshot.groups],
  );

  const groups = useMemo(() => snapshot.groups.map((g) => g.name), [snapshot.groups]);

  // Membership by name, which is what a reader picked and what the sidebar
  // prints. Ids stay below this line.
  const saved = useMemo<SavedCreature[]>(
    () =>
      snapshot.saved.map((row) => ({
        creature: row.creature,
        groups: row.groupIds
          .map((id) => nameById.get(id))
          .filter((name): name is string => Boolean(name)),
        savedAt: row.savedAt,
      })),
    [snapshot.saved, nameById],
  );

  const groupsOf = useCallback(
    (creatureId: number) => saved.find((s) => s.creature.id === creatureId)?.groups ?? [],
    [saved],
  );

  const countIn = useCallback(
    (group: string) =>
      group === ALL_GROUP ? saved.length : saved.filter((s) => s.groups.includes(group)).length,
    [saved],
  );

  const rowsIn = useCallback(
    (group: string) =>
      (group === ALL_GROUP ? [...saved] : saved.filter((s) => s.groups.includes(group))).sort(
        (a, b) => b.savedAt - a.savedAt,
      ),
    [saved],
  );

  const isSaved = useCallback(
    (creatureId: number) => saved.some((s) => s.creature.id === creatureId),
    [saved],
  );

  /* ── what the views change ──────────────────────────────────────────── */

  const addGroup = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      // Names are the reader's handle on a group, so two that differ only by
      // case would be indistinguishable in the sidebar. The store says the
      // same; this only saves the round trip that would hear it.
      if (snap.current.groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
        return false;
      }

      const placeholder = `${PENDING}${trimmed}`;
      update((prev) => ({
        ...prev,
        groups: [...prev.groups, { id: placeholder, name: trimmed, createdAt: Date.now() }],
      }));

      send(async () => {
        const res = await api('/groups', { method: 'POST', body: JSON.stringify({ name: trimmed }) });
        if (!res.ok) return res;

        const { group } = (await res.json()) as { group: Group };
        settled.current.set(placeholder, group.id);
        // Swap the placeholder for the real thing, in the group itself and in
        // anything the reader filed there while the request was out.
        update((prev) => ({
          groups: prev.groups.map((g) => (g.id === placeholder ? { ...g, id: group.id } : g)),
          saved: prev.saved.map((row) =>
            row.groupIds.includes(placeholder)
              ? { ...row, groupIds: row.groupIds.map((id) => (id === placeholder ? group.id : id)) }
              : row,
          ),
        }));
        return null;
      });
      return true;
    },
    [send, update],
  );

  const renameGroup = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      const id = idOf(oldName);
      if (!id) return;

      update((prev) => ({
        ...prev,
        groups: prev.groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
      }));

      send(async () => {
        const real = idNow(id);
        if (real.startsWith(PENDING)) return null;
        return api(`/groups/${real}`, { method: 'PATCH', body: JSON.stringify({ name: trimmed }) });
      });
    },
    [idNow, idOf, send, update],
  );

  const deleteGroup = useCallback(
    (name: string) => {
      const id = idOf(name);
      if (!id) return;

      update((prev) => ({
        groups: prev.groups.filter((g) => g.id !== id),
        // A creature that was only in this group is no longer kept anywhere.
        saved: prev.saved
          .map((row) => ({ ...row, groupIds: row.groupIds.filter((g) => g !== id) }))
          .filter((row) => row.groupIds.length > 0),
      }));

      send(async () => {
        const real = idNow(id);
        if (real.startsWith(PENDING)) return null;
        return api(`/groups/${real}`, { method: 'DELETE' });
      });
    },
    [idNow, idOf, send, update],
  );

  const toggleSave = useCallback(
    (creature: CreatureSummary, group: string): 'added' | 'removed' => {
      const id = idOf(group);
      // Only reachable if the group went away between the menu opening and a
      // row being tapped; nothing was added, and nothing is sent.
      if (!id) return 'removed';

      const row = snap.current.saved.find((s) => s.creature.id === creature.id);
      const wasIn = row?.groupIds.includes(id) ?? false;

      update((prev) => {
        const existing = prev.saved.find((s) => s.creature.id === creature.id);
        if (!existing) {
          return {
            ...prev,
            saved: [{ creature, groupIds: [id], savedAt: Date.now() }, ...prev.saved],
          };
        }
        const groupIds = wasIn
          ? existing.groupIds.filter((g) => g !== id)
          : [...existing.groupIds, id];
        return {
          ...prev,
          saved: prev.saved
            .map((s) =>
              s.creature.id === creature.id
                ? // Refresh the stored snapshot while we're here, in case the
                  // creature's common name or photo has changed upstream.
                  { ...s, creature, groupIds }
                : s,
            )
            .filter((s) => s.groupIds.length > 0),
        };
      });

      send(async () => {
        const real = idNow(id);
        if (real.startsWith(PENDING)) return null;
        return api('/saved', {
          method: 'POST',
          body: JSON.stringify({ creature, groupId: real }),
        });
      });

      return wasIn ? 'removed' : 'added';
    },
    [idNow, idOf, send, update],
  );

  const removeFromGroup = useCallback(
    (creatureId: number, group: string) => {
      const id = idOf(group);
      if (!id) return;

      update((prev) => ({
        ...prev,
        saved: prev.saved
          .map((row) =>
            row.creature.id === creatureId
              ? { ...row, groupIds: row.groupIds.filter((g) => g !== id) }
              : row,
          )
          .filter((row) => row.groupIds.length > 0),
      }));

      send(async () => {
        const real = idNow(id);
        if (real.startsWith(PENDING)) return null;
        return api(`/saved/${creatureId}?group=${encodeURIComponent(real)}`, { method: 'DELETE' });
      });
    },
    [idNow, idOf, send, update],
  );

  const forgetCreature = useCallback(
    (creatureId: number) => {
      update((prev) => ({
        ...prev,
        saved: prev.saved.filter((row) => row.creature.id !== creatureId),
      }));
      send(() => api(`/saved/${creatureId}`, { method: 'DELETE' }));
    },
    [send, update],
  );

  return {
    groups,
    saved,
    ready,
    groupsOf,
    countIn,
    rowsIn,
    isSaved,
    addGroup,
    renameGroup,
    deleteGroup,
    toggleSave,
    removeFromGroup,
    forget: forgetCreature,
  };
}

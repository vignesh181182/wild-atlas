'use client';

/**
 * The saved library: the user's groups, and which creatures sit in which.
 *
 * Persistence is localStorage, but keyed per account, so two people signing in
 * on the same browser get their own notebook rather than each other's. The
 * store is still local to the machine — signing in on a second device gives
 * you an empty library, which is the honest limit of this being localStorage
 * and not a database. Everything goes through this hook, so moving to a real
 * backing store later means changing `read` and `write` and nothing else.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreatureSummary, LibraryState, SavedCreature } from '@/lib/types';

const STORAGE_PREFIX = 'wild-atlas:library:v1';

/**
 * Where the library lived before there were accounts. The first account to
 * sign in on this browser adopts it, so nobody loses the notebook they built
 * up before signing up; it is cleared on the way so the second account doesn't
 * inherit the same creatures.
 */
const LEGACY_STORAGE_KEY = STORAGE_PREFIX;

/**
 * The pseudo-group behind the sidebar's "All" row: everything kept, whichever
 * group it sits in. Not a real group — it is never stored, renamed or deleted.
 * The leading space keeps it out of reach: `addGroup` trims what the user
 * types, so nothing they create can collide with this name.
 */
export const ALL_GROUP = ' all';

/**
 * A new reader starts with nothing, and that is deliberate. There were four
 * example groups here — Favourites, Ocean trip, Dinosaurs, School project —
 * and they were the first thing anybody saw: four empty folders somebody else
 * had named, to be tidied away before the shelf was theirs. A reader who wants
 * a group makes one, and the save menu and the sidebar both offer that at the
 * point it is wanted.
 *
 * This is also what stands in before the stored library has been read, so it
 * has to be the honest empty rather than a guess at what is coming.
 */
const EMPTY: LibraryState = { groups: [], saved: [] };

function parse(raw: string | null): LibraryState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    if (!Array.isArray(parsed.groups) || !Array.isArray(parsed.saved)) return null;
    return { groups: parsed.groups, saved: parsed.saved };
  } catch {
    return null;
  }
}

function read(key: string): LibraryState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const own = parse(window.localStorage.getItem(key));
    if (own) return own;

    // Nothing under this account yet — inherit the pre-accounts notebook if
    // one is still sitting there, and take it out of circulation.
    const legacy = parse(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(key: string, state: LibraryState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // A full or blocked storage quota shouldn't take the app down; the
    // in-memory state stays correct for the rest of the session.
  }
}

export type Library = {
  groups: string[];
  saved: SavedCreature[];
  /** True once this account's library has been read; before that, nothing saved. */
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
 * @param accountId the signed-in user's id, or null while that is still being
 *   established. Null means we don't know whose library to open yet, so the
 *   hook reports nothing saved rather than guessing.
 */
export function useLibrary(accountId: string | null): Library {
  const key = accountId ? `${STORAGE_PREFIX}:${accountId}` : null;

  const [state, setState] = useState<LibraryState>(EMPTY);
  /** Which key the state in hand came from — it lags `key` by one effect. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // `toggleSave` needs to report what it did, which means reading the state it
  // is about to replace. A ref keeps that read current without re-creating the
  // callback on every change.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Read after mount rather than during render, so the server and the first
  // client render agree and React doesn't complain about a hydration mismatch.
  useEffect(() => {
    if (!key) return;
    setState(read(key));
    setLoadedKey(key);
  }, [key]);

  const ready = key !== null && loadedKey === key;

  useEffect(() => {
    if (ready && key) write(key, state);
  }, [state, ready, key]);

  // Between accounts the state in hand still belongs to the previous one, so
  // read through this rather than `state` — it withholds the old library for
  // the one render before the new one arrives.
  const data = ready ? state : EMPTY;

  const groupsOf = useCallback(
    (creatureId: number) => data.saved.find((s) => s.creature.id === creatureId)?.groups ?? [],
    [data.saved],
  );

  const countIn = useCallback(
    (group: string) =>
      group === ALL_GROUP
        ? data.saved.length
        : data.saved.filter((s) => s.groups.includes(group)).length,
    [data.saved],
  );

  const rowsIn = useCallback(
    (group: string) =>
      (group === ALL_GROUP ? [...data.saved] : data.saved.filter((s) => s.groups.includes(group)))
        .sort((a, b) => b.savedAt - a.savedAt),
    [data.saved],
  );

  const isSaved = useCallback(
    (creatureId: number) => data.saved.some((s) => s.creature.id === creatureId),
    [data.saved],
  );

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    let added = false;
    setState((prev) => {
      if (prev.groups.some((g) => g.toLowerCase() === trimmed.toLowerCase())) return prev;
      added = true;
      return { ...prev, groups: [...prev.groups, trimmed] };
    });
    return added;
  }, []);

  const renameGroup = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setState((prev) => ({
      groups: prev.groups.map((g) => (g === oldName ? trimmed : g)),
      saved: prev.saved.map((s) => ({
        ...s,
        groups: s.groups.map((g) => (g === oldName ? trimmed : g)),
      })),
    }));
  }, []);

  const deleteGroup = useCallback((name: string) => {
    setState((prev) => ({
      groups: prev.groups.filter((g) => g !== name),
      // A creature that was only in this group is no longer kept anywhere.
      saved: prev.saved
        .map((s) => ({ ...s, groups: s.groups.filter((g) => g !== name) }))
        .filter((s) => s.groups.length > 0),
    }));
  }, []);

  const toggleSave = useCallback((creature: CreatureSummary, group: string): 'added' | 'removed' => {
    const wasIn = groupsOfIn(stateRef.current, creature.id).includes(group);
    setState((prev) => {
      const existing = prev.saved.find((s) => s.creature.id === creature.id);
      if (!existing) {
        return {
          ...prev,
          saved: [...prev.saved, { creature, groups: [group], savedAt: Date.now() }],
        };
      }
      const groups = existing.groups.includes(group)
        ? existing.groups.filter((g) => g !== group)
        : [...existing.groups, group];
      return {
        ...prev,
        saved: prev.saved
          .map((s) =>
            s.creature.id === creature.id
              ? // Refresh the stored snapshot while we're here, in case the
                // creature's common name or photo has changed upstream.
                { ...s, creature, groups }
              : s,
          )
          .filter((s) => s.groups.length > 0),
      };
    });
    return wasIn ? 'removed' : 'added';
  }, []);

  const removeFromGroup = useCallback((creatureId: number, group: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved
        .map((s) =>
          s.creature.id === creatureId ? { ...s, groups: s.groups.filter((g) => g !== group) } : s,
        )
        .filter((s) => s.groups.length > 0),
    }));
  }, []);

  const forget = useCallback((creatureId: number) => {
    setState((prev) => ({ ...prev, saved: prev.saved.filter((s) => s.creature.id !== creatureId) }));
  }, []);

  return {
    groups: data.groups,
    saved: data.saved,
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
    forget,
  };
}

function groupsOfIn(state: LibraryState, creatureId: number): string[] {
  return state.saved.find((s) => s.creature.id === creatureId)?.groups ?? [];
}

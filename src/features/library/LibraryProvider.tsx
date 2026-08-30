'use client';

/**
 * One library for the whole app, held above the pages.
 *
 * `useLibrary` keeps its state in the component that calls it, so every caller
 * used to get a library of its own — its own state, and its own trip to the
 * server. The sidebar wanted one and so did the page inside it, which meant
 * two identical requests for the same shelf on every screen; and because a
 * page unmounts when you leave it, moving between groups asked the store again
 * each time, for something that had not changed.
 *
 * Held in the layout instead, it is fetched once and then simply read. Opening
 * a group becomes free, because the answer is already in hand.
 */

import { useUser } from '@clerk/nextjs';
import { createContext, useContext } from 'react';
import { useLibrary, type Library } from '@/features/library/useLibrary';

const LibraryContext = createContext<Library | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const library = useLibrary(user?.id ?? null);
  return <LibraryContext.Provider value={library}>{children}</LibraryContext.Provider>;
}

/**
 * The app's library. Throws rather than quietly handing back an empty one: a
 * component outside the provider would otherwise look like a reader with
 * nothing saved, which is the kind of bug that gets reported as lost data.
 */
export function useSharedLibrary(): Library {
  const library = useContext(LibraryContext);
  if (!library) throw new Error('useSharedLibrary must be used inside <LibraryProvider>');
  return library;
}

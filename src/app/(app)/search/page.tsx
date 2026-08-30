'use client';

/**
 * Search, at its own address, with the query in the URL — so a search can be
 * linked to and survives a reload, the same reason a creature became a route.
 *
 * The field lives here and nowhere else. It used to sit above every page on a
 * wide screen, which put a search box on the surprise and on the groups where
 * nobody was searching; the rail and the tab bar are how you reach this.
 */

import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useSharedLibrary } from '@/features/library/LibraryProvider';
import { GlobalSearch } from '@/features/search/components/GlobalSearch';
import { ResultsView } from '@/features/search/components/ResultsView';
import { useSearch } from '@/features/search/useSearch';

function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get('q') ?? '').trim();

  const { user } = useUser();
  const library = useSharedLibrary();
  const results = useSearch(query);

  return (
    <>
      <GlobalSearch />

      {query ? (
        <ResultsView
          query={query}
          results={results.data}
          loading={results.loading}
          error={results.error}
          isSaved={library.isSaved}
          onOpen={(creature) => router.push(`/creature/${creature.id}`)}
          onClear={() => router.replace('/search')}
        />
      ) : (
        <div className="view">
          <div className="empty-note">Search for any living thing — then keep what you find.</div>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  // useSearchParams needs a boundary so the shell can still be prerendered.
  return (
    <Suspense fallback={<div className="status-note">Loading…</div>}>
      <SearchScreen />
    </Suspense>
  );
}

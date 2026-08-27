'use client';

/**
 * Search, at its own address, with the query in the URL — so a search can be
 * linked to and survives a reload, the same reason a creature became a route.
 *
 * The field itself only appears here on narrow screens. Above the breakpoint
 * the shell already shows one, and a second would be one too many.
 */

import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useLibrary } from '@/features/library/useLibrary';
import { GlobalSearch } from '@/features/search/components/GlobalSearch';
import { ResultsView } from '@/features/search/components/ResultsView';
import { useSearch } from '@/features/search/useSearch';

function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const query = (params.get('q') ?? '').trim();

  const { user } = useUser();
  const library = useLibrary(user?.id ?? null);
  const results = useSearch(query);

  return (
    <>
      <GlobalSearch className="topbar-narrow" />

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

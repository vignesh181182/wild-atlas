'use client';

/**
 * Search, at its own address.
 *
 * The query lives in the URL rather than in component state, so a search can
 * be linked to and survives a reload — the same reason a creature became a
 * route. Typing replaces the entry rather than pushing, so the back button
 * leaves the search rather than walking back through every keystroke.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ResultsView } from '@/features/search/components/ResultsView';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useSearch } from '@/features/search/useSearch';
import { useUser } from '@clerk/nextjs';
import { useLibrary } from '@/features/library/useLibrary';

function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get('q') ?? '';

  const { user } = useUser();
  const library = useLibrary(user?.id ?? null);
  const results = useSearch(query);

  function setQuery(next: string) {
    const q = next.trim();
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <>
      <div className="topbar">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          suggestions={(results.data ?? []).slice(0, 5)}
          onPick={(creature) => router.push(`/creature/${creature.id}`)}
        />
      </div>

      {query.trim() ? (
        <ResultsView
          query={query.trim()}
          results={results.data}
          loading={results.loading}
          error={results.error}
          isSaved={library.isSaved}
          onOpen={(creature) => router.push(`/creature/${creature.id}`)}
          onClear={() => setQuery('')}
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

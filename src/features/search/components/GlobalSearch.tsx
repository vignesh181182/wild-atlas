'use client';

/**
 * The search field, wherever it is shown.
 *
 * The query lives in the URL, so this reads its own value back from there and
 * every page agrees on what is being searched for. On a wide screen it sits in
 * the shell above whatever page you are on, the way it did when the app was
 * one screen; on a narrow one the tab bar leads to /search, which shows it
 * there instead.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useSearch } from '@/features/search/useSearch';

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const results = useSearch(query);

  function setQuery(next: string) {
    const q = next.trim();
    const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    // Refining a search replaces the entry, so the back button leaves the
    // search rather than walking back through every keystroke. Arriving at
    // one from a creature's page pushes, so back returns to the creature.
    if (pathname.startsWith('/search')) router.replace(url);
    else router.push(url);
  }

  return (
    <div className={className ? `topbar ${className}` : 'topbar'}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={() => setQuery('')}
        suggestions={(results.data ?? []).slice(0, 5)}
        onPick={(creature) => router.push(`/creature/${creature.id}`)}
      />
    </div>
  );
}

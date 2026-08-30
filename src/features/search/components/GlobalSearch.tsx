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
  // Trimmed to search, untrimmed to type into: a query of "snow " and one of
  // "snow" are the same search, and asking twice would be a waste.
  const results = useSearch(query.trim());

  function setQuery(next: string) {
    // The text goes to the URL as typed. It used to be trimmed on the way,
    // which meant the space bar did not work: this field reads its own value
    // back out of the URL, so a trailing space was removed before it could be
    // read, and the next letter landed against the previous one — "snow
    // leopard" arrived as "snowleopard". Only whether there is a search at all
    // is decided by the trimmed form.
    const url = next.trim() ? `/search?q=${encodeURIComponent(next)}` : '/search';
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

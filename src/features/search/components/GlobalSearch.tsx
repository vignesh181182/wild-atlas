'use client';

/**
 * The search field, wherever it is shown.
 *
 * What you type is held here, in the component, and the URL follows a moment
 * later. It used to be the other way round: the field read its value straight
 * back out of the URL and wrote to the URL on every keystroke. That made each
 * letter wait on a router navigation before it could appear, and typing any
 * faster than the round trip dropped characters — "sunflower" arriving as "f".
 *
 * The query still ends up in the URL, because a search should be linkable and
 * survive a reload. It just gets there once the typing settles, rather than
 * standing between the reader and their own keyboard.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useSearch } from '@/features/search/useSearch';

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get('q') ?? '';

  const [text, setText] = useState(urlQuery);

  // `useSearch` does its own settling before it asks the network, so this can
  // have the text as typed and still make one request per pause.
  const results = useSearch(text);

  const settled = useDebouncedValue(text, 300);

  /** The last value this component put in the URL, so it can tell its own
   *  writes coming back from somebody else's. */
  const written = useRef(urlQuery);

  // Follow the URL when something other than typing changes it — a link into
  // a search, the back button — but not when it is our own write returning.
  useEffect(() => {
    if (urlQuery === written.current) return;
    written.current = urlQuery;
    setText(urlQuery);
  }, [urlQuery]);

  // And put the settled text there, so the search can be linked to.
  useEffect(() => {
    // Whitespace alone is not a search, and would otherwise leave the URL and
    // this ref disagreeing for ever, writing on every render.
    const next = settled.trim() ? settled : '';
    if (next === urlQuery) return;
    written.current = next;
    const url = next ? `/search?q=${encodeURIComponent(next)}` : '/search';
    // Refining a search replaces the entry, so back leaves the search rather
    // than walking through every pause in the typing. Arriving from a
    // creature's page pushes, so back returns to the creature.
    if (pathname.startsWith('/search')) router.replace(url);
    else router.push(url);
  }, [settled, urlQuery, pathname, router]);

  return (
    <div className={className ? `topbar ${className}` : 'topbar'}>
      <SearchBar
        value={text}
        onChange={setText}
        onClear={() => setText('')}
        suggestions={(results.data ?? []).slice(0, 5)}
        onPick={(creature) => router.push(`/creature/${creature.id}`)}
      />
    </div>
  );
}

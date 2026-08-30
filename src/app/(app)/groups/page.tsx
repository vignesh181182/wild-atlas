'use client';

/**
 * Every group, and how much is in each — where the "Groups" tab lands.
 *
 * On a wide screen the sidebar already lists these, so this page mostly earns
 * its keep on narrow ones, where the sidebar is not there to ask.
 */

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ALL_GROUP } from '@/features/library/useLibrary';
import { useSharedLibrary } from '@/features/library/LibraryProvider';

export default function GroupsPage() {
  const { user } = useUser();
  const library = useSharedLibrary();

  return (
    <div className="view">
      <h2 className="view-title">Groups</h2>
      <div className="group-index">
        <Link className="group-index-row" href={`/groups/${encodeURIComponent(ALL_GROUP)}`}>
          <span className="group-name">All</span>
          <span className="group-count">{library.saved.length || '—'}</span>
        </Link>
        {library.groups.map((group) => (
          <Link
            className="group-index-row"
            key={group}
            href={`/groups/${encodeURIComponent(group)}`}
          >
            <span className="group-name">{group}</span>
            <span className="group-count">{library.countIn(group) || '—'}</span>
          </Link>
        ))}
      </div>

      {/* Below 900px the sidebar is not rendered, so this is the only place
          the way out is offered at all — and this page is one of the three
          the tab bar reaches, which is what makes it the right one. */}
      <a className="notebook-link is-standalone" href="/transfer">
        Save a copy of your notebook
      </a>
    </div>
  );
}

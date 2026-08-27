'use client';

/**
 * Every group, and how much is in each — where the "Groups" tab lands.
 *
 * On a wide screen the sidebar already lists these, so this page mostly earns
 * its keep on narrow ones, where the sidebar is not there to ask.
 */

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ALL_GROUP, useLibrary } from '@/features/library/useLibrary';

export default function GroupsPage() {
  const { user } = useUser();
  const library = useLibrary(user?.id ?? null);

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
    </div>
  );
}

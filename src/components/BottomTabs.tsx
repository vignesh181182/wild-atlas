'use client';

/**
 * The three places to be, on narrow screens: today's surprise, search, and
 * what has been kept. It floats over the foot of the page rather than sitting
 * under it, which is what lets the reading column run to the bottom edge.
 *
 * The active tab is worked out from the path, so it stays right through a
 * back button or a link from anywhere else.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderIcon, GiftIcon, SearchIcon } from '@/components/icons';

const TABS = [
  { href: '/', label: "Today's surprise", Icon: GiftIcon, match: (p: string) => p === '/' },
  { href: '/search', label: 'Search', Icon: SearchIcon, match: (p: string) => p.startsWith('/search') },
  { href: '/groups', label: 'Groups', Icon: FolderIcon, match: (p: string) => p.startsWith('/groups') },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className="tab"
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            data-tip={label}
          >
            <Icon size={16} />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The three places to be. One list, so the rail on a wide screen and the tab
 * bar on a narrow one can never drift apart.
 */

import { FolderIcon, GiftIcon, SearchIcon } from '@/components/icons';

export const NAV = [
  { href: '/', label: "Today's surprise", Icon: GiftIcon, match: (p: string) => p === '/' },
  {
    href: '/search',
    label: 'Search',
    Icon: SearchIcon,
    match: (p: string) => p.startsWith('/search'),
  },
  {
    href: '/groups',
    label: 'Groups',
    Icon: FolderIcon,
    match: (p: string) => p.startsWith('/groups'),
  },
];

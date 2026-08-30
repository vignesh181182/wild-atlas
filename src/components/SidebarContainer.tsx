'use client';

/**
 * The sidebar, wired to the router rather than to a parent's callbacks.
 *
 * Under the old single-screen app this state lived in WildAtlas and came down
 * as props. Now that a group and a creature are each their own URL, the
 * sidebar can work out what is on screen from the path, which is what lets it
 * live in a layout and stop re-mounting between pages.
 */

import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SideRail } from '@/components/SideRail';
import { useSharedLibrary } from '@/features/library/LibraryProvider';
import { useSurpriseState } from '@/features/surprise/useSurprise';
import { useToast } from '@/hooks/useToast';

/** Which way the menu was left. A preference, so it outlives the page. */
const EXPANDED_KEY = 'wild-atlas:menu-expanded';

export function SidebarContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const accountId = user?.id ?? null;

  // The design's left menu is the rail, so that is where this starts. Read
  // after mount, or the server and the first client render disagree.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      setExpanded(window.localStorage.getItem(EXPANDED_KEY) === '1');
    } catch {
      // A blocked storage is not worth failing over; the rail is the default.
    }
  }, []);

  function setMenu(open: boolean) {
    setExpanded(open);
    try {
      window.localStorage.setItem(EXPANDED_KEY, open ? '1' : '0');
    } catch {
      // Same again: the menu still works, it just will not be remembered.
    }
  }

  const library = useSharedLibrary();
  // State only: the unread dot should not cost a creature fetch.
  const surprise = useSurpriseState(accountId);
  const toast = useToast();

  const activeGroup = pathname.startsWith('/groups/')
    ? decodeURIComponent(pathname.slice('/groups/'.length))
    : null;

  if (!expanded) return <SideRail onExpand={() => setMenu(true)} />;

  return (
    <>
      <Sidebar
        onCollapse={() => setMenu(false)}
        library={library}
        activeGroup={activeGroup}
        onSelectGroup={(group) => router.push(`/groups/${encodeURIComponent(group)}`)}
        onOpenSurprise={() => router.push('/')}
        surpriseActive={pathname === '/'}
        surpriseUnread={!surprise.settled}
        onNotify={toast.flash}
      />
      {toast.message ? (
        <div className="toast" role="status">
          {toast.message}
        </div>
      ) : null}
    </>
  );
}

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
import { Sidebar } from '@/components/Sidebar';
import { useLibrary } from '@/features/library/useLibrary';
import { useSurpriseState } from '@/features/surprise/useSurprise';
import { useToast } from '@/hooks/useToast';

export function SidebarContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const accountId = user?.id ?? null;

  const library = useLibrary(accountId);
  // State only: the unread dot should not cost a creature fetch.
  const surprise = useSurpriseState(accountId);
  const toast = useToast();

  const activeGroup = pathname.startsWith('/groups/')
    ? decodeURIComponent(pathname.slice('/groups/'.length))
    : null;

  return (
    <>
      <Sidebar
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

/**
 * The shell every signed-in page sits in: the sidebar, and a column beside it.
 *
 * The session check lives here rather than on each page, so a new route is
 * behind the gate by virtue of being in this folder. It is still a check on
 * the resource — the layout is the resource these pages are rendered into.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BottomTabs } from '@/components/BottomTabs';
import { LibraryProvider } from '@/features/library/LibraryProvider';
import { SidebarContainer } from '@/components/SidebarContainer';
import { TopBar } from '@/components/TopBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    // Above the shell, so the sidebar and whatever page it frames read one
    // library between them rather than fetching one each.
    <LibraryProvider>
      <div className="app">
        {/* Three shells' worth of furniture, two of which are hidden at any
            one width: the sidebar above 900px, the bar and tabs below it.
            Which is which is decided in CSS rather than by measuring the
            window, so the first paint is already right. */}
        <SidebarContainer />
        <TopBar />
        <main className="main">{children}</main>
        <BottomTabs />
      </div>
    </LibraryProvider>
  );
}

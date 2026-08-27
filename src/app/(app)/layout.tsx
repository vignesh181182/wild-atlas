/**
 * The shell every signed-in page sits in: the sidebar, and a column beside it.
 *
 * The session check lives here rather than on each page, so a new route is
 * behind the gate by virtue of being in this folder. It is still a check on
 * the resource — the layout is the resource these pages are rendered into.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SidebarContainer } from '@/components/SidebarContainer';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="app">
      <SidebarContainer />
      <main className="main">{children}</main>
    </div>
  );
}

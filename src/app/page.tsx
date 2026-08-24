/**
 * The gate in front of the app.
 *
 * Clerk's own guidance since v7 is to check on the resource rather than by
 * matching paths in middleware, because middleware matching can drift from the
 * way Next actually routes a request. So the check lives here, on the page
 * that has something to protect, and the middleware only carries the session.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { WildAtlas } from '@/components/WildAtlas';

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <WildAtlas />;
}

/**
 * The two things every profile route does before it does anything else: work
 * out who is asking, and refuse to let the answer be cached.
 *
 * The open routes — creature, search — are the opposite case: identical for
 * everybody and cached hard at the edge. Anything reaching Firestore is one
 * reader's own library, so it is private, uncacheable, and 401 without a
 * session. The user id comes from the Clerk session and never from the
 * request, or one reader could ask for another's shelf by typing their id.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control': 'private, no-store' };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

export async function withUser(run: (userId: string) => Promise<Response>): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return json({ error: 'Sign in to keep a library.' }, 401);

  try {
    return await run(userId);
  } catch (error) {
    // The store being down is not the reader's fault and not their business
    // either; the detail goes to the log, a flat apology comes back.
    console.error('[api/library]', error);
    return json({ error: 'The library is unavailable right now.' }, 502);
  }
}

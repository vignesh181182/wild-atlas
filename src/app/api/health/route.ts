/**
 * Whether this deployment can reach its store — and nothing else.
 *
 * Shipping the profile requires three environment variables that only exist
 * on the deployment, and there is no way to tell from outside whether they
 * are set: every route that would touch Firestore checks the session first
 * and answers 401 to a stranger. Without this, finding out means shipping the
 * migration and watching whether readers lose their shelves.
 *
 * It reports a boolean. Not the project, not the account, not whether a key
 * parses — only whether all three names have values, which is what decides
 * whether the library can be served at all.
 */

import { NextResponse } from 'next/server';
import { firestoreConfigured } from '@/server/firestore';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { store: firestoreConfigured() ? 'configured' : 'missing-credentials' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

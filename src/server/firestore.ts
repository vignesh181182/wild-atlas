/**
 * The Firestore handle, and the one place credentials are read.
 *
 * Everything reaches Firestore through the Admin SDK on the server, never from
 * the browser: Clerk already says who the caller is, so the alternative —
 * client-side Firestore behind security rules — would mean issuing Firebase
 * credentials for a user Firebase does not know about. The rules on the
 * project should stay deny-all; the Admin SDK bypasses them, and nothing else
 * is meant to get in.
 *
 * Initialisation is lazy because Next evaluates module scope at build time,
 * and the build has no credentials. A plain function rather than a Proxy: a
 * Proxy around a client this shape breaks anything that inspects it.
 */

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const APP = 'wild-atlas';

function credentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Service-account keys carry real newlines. Whichever way the value survived
  // being pasted into an env var — literal \n or the real thing — normalise it.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean);
    throw new Error(
      `Firestore is not configured — missing ${missing.join(', ')}. ` +
        'See .env.example; the values come from a Firebase service-account key.',
    );
  }
  return { projectId, clientEmail, privateKey };
}

let handle: Firestore | null = null;

export function db(): Firestore {
  if (handle) return handle;
  const app = getApps().some((a) => a.name === APP)
    ? getApp(APP)
    : initializeApp({ credential: cert(credentials()) }, APP);
  handle = getFirestore(app);
  // Undefined is what an optional field looks like in this codebase; without
  // this Firestore rejects the whole write rather than omitting the field.
  handle.settings({ ignoreUndefinedProperties: true });
  return handle;
}

/** True when the environment can reach Firestore at all. */
export function firestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

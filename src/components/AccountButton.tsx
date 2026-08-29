'use client';

/**
 * Clerk's user button, with the running version added to the menu it opens.
 *
 * The button appears in three places — the sidebar, the rail it folds to, and
 * the top bar on a narrow screen — so the version lives here rather than in
 * each of them, where three copies would eventually disagree.
 *
 * It is a menu item rather than a caption because Clerk's popover is rendered
 * in a portal of its own: an item added through `UserButton.MenuItems` is the
 * supported way in, and anything written around the button lands outside the
 * popover instead of under it.
 *
 * Clicking it copies the version. A version worth showing at all is one
 * somebody is about to quote back — into a bug report, or an answer to "which
 * one are you on" — and a string of hex is the kind of thing that gets
 * mistyped.
 */

import { UserButton } from '@clerk/nextjs';
import { useCallback } from 'react';

/** Inlined at build time by next.config.ts. */
const VERSION = process.env.APP_VERSION ?? 'unknown';

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 7V2.5H7L13.5 9L9 13.5L2.5 7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="5.25" cy="5.25" r="1" fill="currentColor" />
    </svg>
  );
}

export function AccountButton(props: React.ComponentProps<typeof UserButton>) {
  const copy = useCallback(() => {
    // Nothing to tell the reader if this fails: the version is on screen in
    // front of them either way, which is the thing they came for.
    void navigator.clipboard?.writeText(VERSION).catch(() => {});
  }, []);

  return (
    <UserButton {...props}>
      <UserButton.MenuItems>
        <UserButton.Action label={VERSION} labelIcon={<TagIcon />} onClick={copy} />
      </UserButton.MenuItems>
    </UserButton>
  );
}

/**
 * Clerk ships its own look, which is a perfectly good look and entirely the
 * wrong one for this app. These are the Classical tokens (styles/classical.css)
 * handed over in the shape Clerk wants them: warm paper, ink, and the brass
 * accent on anything that is the one thing to press.
 *
 * The values are duplicated as literals rather than read from CSS variables
 * because Clerk renders parts of its UI into a shadow root, where the app's
 * custom properties do not reach. The fonts are the exception — those come
 * through `next/font`, which puts them on `html`, above the shadow boundary.
 *
 * If a token changes in classical.css, change it here too.
 */

import type { ClerkAppearanceTheme } from '@clerk/react/types';

export const clerkAppearance: ClerkAppearanceTheme = {
  variables: {
    colorPrimary: '#b68235',
    colorPrimaryForeground: '#f3f2f2',
    colorBackground: '#f3f2f2',
    colorForeground: '#201f1d',
    colorMuted: '#eae9e9',
    colorMutedForeground: '#6d6a66',
    colorInput: '#f3f2f2',
    colorInputForeground: '#201f1d',
    colorNeutral: '#201f1d',
    colorDanger: '#a03c28',
    fontFamily: 'var(--font-sans)',
    borderRadius: '4px',
  },
  elements: {
    // The page already draws the frame these would sit inside, so the card
    // itself contributes nothing but its contents.
    cardBox: { boxShadow: 'none', border: 'none' },
    card: { boxShadow: 'none', border: 'none', background: 'transparent' },
    header: { display: 'none' },
    footer: { background: 'transparent' },
    footerAction: { background: 'transparent' },
    socialButtonsBlockButton: {
      borderColor: 'rgba(32, 31, 29, 0.16)',
    },
    formButtonPrimary: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
};

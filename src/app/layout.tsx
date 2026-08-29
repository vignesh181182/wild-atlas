import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, Newsreader } from 'next/font/google';
import { clerkAppearance } from '@/features/auth/clerk-appearance';
import '@/styles/classical.css';
import '@/styles/globals.css';

/**
 * Three faces, three jobs.
 *
 * Instrument Serif is the voice: high contrast, only ever large — the
 * creature's name, the numbers, the brand. Newsreader is for reading, and for
 * the italic scientific names. Inter does everything an interface does, which
 * is what stops the whole thing reading like a broadsheet.
 *
 * All three are self-hosted by next/font, so there is no render-blocking call
 * to Google and no flash of the wrong metrics.
 */
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const reading = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-reading-loaded',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wild Atlas',
  description:
    'Search any living thing — animal, bird, insect, plant or extinct — read about it, and keep it in a group.',
  // Saved to a home screen on an iPhone or iPad, the bookmark takes its emblem
  // from app/apple-icon.png and its name from here. Without the name iOS falls
  // back to whatever that page's own <title> was — "Sign in — Wild Atlas" for
  // anyone who bookmarked from the door — and without the icon it draws a
  // letter.
  //
  // `capable: false` is deliberate and worth saying out loud: left unset, Next
  // writes apple-mobile-web-app-capable=yes for you, and the bookmark then
  // opens with no Safari around it — no back gesture, no address bar, and a
  // sign-in that leaves the window to reach Clerk with nowhere obvious to come
  // back to.
  appleWebApp: { title: 'Wild Atlas', capable: false },
};

export const viewport: Viewport = {
  themeColor: '#f3f2f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${reading.variable} ${sans.variable}`}>
      <body>
        {/* Inside <body> rather than wrapping <html>, which is what Clerk asks
            for since v7 — it keeps the provider from forcing the document
            shell to render dynamically. */}
        <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/sign-in">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

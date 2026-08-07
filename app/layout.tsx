import type { Metadata, Viewport } from 'next';
import '@/styles/classical.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wild Atlas',
  description:
    'Search any living thing — animal, bird, insect, plant or extinct — read about it, and keep it in a group.',
};

export const viewport: Viewport = {
  themeColor: '#f3f2f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The design system pulls the roman cuts; the app also uses Lora italic. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

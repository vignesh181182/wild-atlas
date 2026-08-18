import Image from 'next/image';
import logo from '@/public/wild-atlas-logo.png';

/**
 * The frame both doors share: the masthead, a line about what is behind them,
 * and whichever of Clerk's two forms is being shown. Keeping it in one place
 * is what stops sign-in and sign-up drifting a few pixels apart.
 *
 * The lockup carries the name, so there is no text masthead here — setting
 * "Wild Atlas" again underneath it would say the same thing twice. It stays
 * inside the h1 so the page still has a heading for anything reading the
 * document rather than looking at it.
 */

export function AuthGate({
  tagline,
  children,
}: {
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <main className="gate">
      <div className="gate-panel">
        <h1 className="gate-brand">
          <Image src={logo} alt="Wild Atlas" priority sizes="220px" />
        </h1>
        <p className="gate-tagline">{tagline}</p>
        {children}
      </div>
    </main>
  );
}

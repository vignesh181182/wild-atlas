/**
 * The frame both doors share: the masthead, a line about what is behind them,
 * and whichever of Clerk's two forms is being shown. Keeping it in one place
 * is what stops sign-in and sign-up drifting a few pixels apart.
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
        <h1 className="gate-brand">Wild Atlas</h1>
        <p className="gate-tagline">{tagline}</p>
        {children}
      </div>
    </main>
  );
}

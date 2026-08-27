/**
 * Shown the instant a creature is asked for, while the server assembles it.
 *
 * Without this the router holds the old page on screen until all eight
 * upstream calls have answered — which on a cold creature is long enough to
 * look like the click did nothing. Next swaps this in immediately and streams
 * the real page in behind it, so navigation stays honest about what it is
 * doing. The wording is the one the old client-side version used.
 */

export default function Loading() {
  return <div className="status-note">Reading up on it…</div>;
}

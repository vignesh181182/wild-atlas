/**
 * What a reader sees while the shell is on its way.
 *
 * Every page in here is behind a session check the server has to make before
 * it can render anything, and on a phone over a slow connection that check is
 * long enough to sit on an empty screen wondering whether the tap registered.
 * Only the creature page had an answer to that; this gives one to the rest.
 *
 * Quiet on purpose — it is meant to be replaced within a moment, and a spinner
 * that flashes is worse than a page that simply arrives.
 */
export default function Loading() {
  return (
    <div className="view" aria-busy="true">
      <p className="empty-note">Loading…</p>
    </div>
  );
}

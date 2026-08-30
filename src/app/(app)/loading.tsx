/**
 * Shown while the shell resolves, for any page in here without one of its own.
 *
 * Every page behind this layout waits on a session check the server makes
 * before it can render, which on a phone is long enough to sit looking at
 * nothing. A shape is a better answer than a blank: it says where the page
 * will be.
 */
import { PageSkeleton } from '@/components/skeletons';

export default function Loading() {
  return <PageSkeleton />;
}

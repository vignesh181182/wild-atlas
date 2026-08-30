/**
 * Shown the instant a creature is asked for, while the server assembles it.
 *
 * Without this the router holds the old page on screen until all eight
 * upstream calls have answered — long enough on a cold creature to look like
 * the click did nothing. The shape is the creature's own, so the photograph
 * and the figures land where they were already standing.
 */
import { CreatureSkeleton } from '@/components/skeletons';

export default function Loading() {
  return <CreatureSkeleton />;
}

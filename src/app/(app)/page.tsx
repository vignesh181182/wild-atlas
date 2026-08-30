'use client';

/**
 * Today's surprise — one creature, and it waits.
 *
 * The last of the five screens to leave WildAtlas. It is a creature's page
 * like any other, so it renders the same one, with an eyebrow above the name
 * and the knowledge that being dealt with either way settles it.
 *
 * Client-side because which surprise is on offer is still per-browser state;
 * it becomes a server component when that moves to the reader's profile.
 */

import { useUser } from '@clerk/nextjs';
import { CreatureSkeleton } from '@/components/skeletons';
import { CreatureScreen } from '@/features/creatures/components/CreatureScreen';
import { QuietView } from '@/features/surprise/components/QuietView';
import { useSurprise } from '@/features/surprise/useSurprise';

export default function SurprisePage() {
  const { user } = useUser();
  const surprise = useSurprise(user?.id ?? null);

  if (surprise.settled) {
    return <QuietView note="Your next surprise arrives tomorrow." />;
  }
  if (surprise.loading) {
    return <CreatureSkeleton />;
  }
  if (surprise.error) {
    return (
      <div className="view">
        <div className="empty-note">{surprise.error}</div>
      </div>
    );
  }
  if (!surprise.creature) return null;

  return (
    <CreatureScreen
      creature={surprise.creature}
      eyebrow="Today’s surprise"
      onSettle={surprise.settle}
    />
  );
}

import { GroupIndexSkeleton } from '@/components/skeletons';

/** The groups page, before the shelf is in hand. */
export default function Loading() {
  return (
    <div className="view">
      <h2 className="view-title">Groups</h2>
      <GroupIndexSkeleton />
    </div>
  );
}

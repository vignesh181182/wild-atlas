import { LibraryRowsSkeleton } from '@/components/skeletons';

/** One group, before its creatures are in hand. */
export default function Loading() {
  return (
    <div className="view">
      <div className="page-head">
        <div className="skeleton" style={{ height: 30, width: 180 }} />
      </div>
      <LibraryRowsSkeleton />
    </div>
  );
}

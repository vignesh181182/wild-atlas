import { LibraryRowsSkeleton } from '@/components/skeletons';

/** Search, before the field and any results it already had are on screen. */
export default function Loading() {
  return (
    <div className="view">
      <div className="skeleton" style={{ height: 52, width: '100%', borderRadius: 12 }} />
      <div style={{ height: 20 }} />
      <LibraryRowsSkeleton rows={4} />
    </div>
  );
}

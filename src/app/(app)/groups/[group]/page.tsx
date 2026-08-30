'use client';

/**
 * One saved group, at its own address.
 *
 * Client-side for now because the library is still localStorage; when it moves
 * to the reader's profile this becomes a server component like the creature
 * page, and the group id goes in the URL in place of its name.
 */

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { LibraryView } from '@/features/library/components/LibraryView';
import { ALL_GROUP } from '@/features/library/useLibrary';
import { useSharedLibrary } from '@/features/library/LibraryProvider';
import { useToast } from '@/hooks/useToast';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams<{ group: string }>();
  const { user } = useUser();
  const library = useSharedLibrary();
  const toast = useToast();

  const group = decodeURIComponent(params.group);
  const showingAll = group === ALL_GROUP;

  return (
    <>
      <LibraryView
        title={showingAll ? 'All' : group}
        rows={library.rowsIn(group)}
        emptyNote={
          showingAll
            ? 'Nothing kept yet — search for a creature and save it to a group.'
            : 'Nothing in this group yet — search for a creature and save it here.'
        }
        onOpen={(id) => router.push(`/creature/${id}`)}
        onRemove={(creatureId) => {
          // In "All" there is no one group to leave, so removing means the
          // creature is no longer kept at all.
          if (showingAll) {
            library.forget(creatureId);
            toast.flash('Removed — no longer kept in any group');
            return;
          }
          library.removeFromGroup(creatureId, group);
          toast.flash(`Removed from “${group}”`);
        }}
      />
      {toast.message ? (
        <div className="toast" role="status">
          {toast.message}
        </div>
      ) : null}
    </>
  );
}

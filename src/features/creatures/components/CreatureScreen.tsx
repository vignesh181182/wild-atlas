'use client';

/**
 * The interactive half of a creature's page.
 *
 * The page itself is a server component: it fetches the creature and renders
 * this around it. Everything that needs a click lives here — the save menu,
 * the gallery, the range map — and nothing here fetches, which is what lets
 * the page be cached and shared as a URL.
 *
 * The overlays belong to this screen rather than to the app shell, because
 * they are all about the creature on it. A shell that owned them would need
 * the creature passed back up to it.
 */

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { DetailView } from '@/features/creatures/components/DetailView';
import { GalleryOverlay } from '@/features/creatures/components/GalleryOverlay';
import { MapOverlay } from '@/features/creatures/components/MapOverlay';
import { SaveMenu } from '@/features/library/components/SaveMenu';
import { toStoredSummary } from '@/features/library/summary';
import { useLibrary } from '@/features/library/useLibrary';
import { useToast } from '@/hooks/useToast';
import type { Tone } from '@/features/creatures/server/tone';
import type { CreatureDetail } from '@/lib/types';

export function CreatureScreen({
  creature,
  eyebrow,
  tone,
  onSettle,
}: {
  creature: CreatureDetail;
  /** Sampled on the server from the photograph — see server/tone.ts. */
  tone?: Tone;
  /** A line above the title, e.g. "Today's surprise". */
  eyebrow?: string;
  /**
   * Given only by the surprise, which is settled by being dealt with either
   * way — kept or discarded. Its presence is also what says there is nothing
   * behind this page to go back to.
   */
  onSettle?: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const library = useLibrary(user?.id ?? null);
  const toast = useToast();

  const [saveAnchor, setSaveAnchor] = useState<{ top: number; right: number } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  const closeSaveMenu = useCallback(() => setSaveAnchor(null), []);
  const closeOverlays = useCallback(() => {
    setSaveAnchor(null);
    setGalleryOpen(false);
    setMapOpen(false);
  }, []);

  /**
   * The menu is positioned inside this column, but the button that opens it
   * sits in a scrolling child. Convert the button's viewport box into column
   * coordinates so the panel hangs just beneath it.
   */
  function openSaveMenuUnder(button: DOMRect) {
    if (saveAnchor) {
      closeSaveMenu();
      return;
    }
    const column = columnRef.current?.getBoundingClientRect();
    if (!column) return;
    setSaveAnchor({
      top: button.bottom - column.top + 8,
      right: Math.max(column.right - button.right, 16),
    });
  }

  const memberOf = library.groupsOf(creature.id);

  function toggleSaveInto(group: string) {
    const result = library.toggleSave(toStoredSummary(creature), group);
    // Keeping the surprise settles it too — it has found its home.
    const settles = result === 'added' && onSettle !== undefined;
    if (settles) onSettle();
    toast.flash(
      result === 'added'
        ? settles
          ? `Saved ${creature.name} to “${group}” — your next surprise arrives tomorrow`
          : `Saved ${creature.name} to “${group}” — it will stay in your groups`
        : `Removed ${creature.name} from “${group}”`,
    );
  }

  function discard() {
    library.forget(creature.id);
    closeOverlays();
    if (onSettle) {
      onSettle();
      toast.flash('Surprise discarded — a new one arrives tomorrow');
      return;
    }
    toast.flash(`${creature.name} discarded — nothing kept`);
    router.back();
  }

  return (
    <div ref={columnRef} style={{ position: 'relative' }}>
      <DetailView
        creature={creature}
        eyebrow={eyebrow}
        tone={tone}
        savedCount={memberOf.length}
        backLabel="Back"
        // The surprise is where you start; there is nothing behind it.
        onBack={onSettle ? undefined : () => router.back()}
        onOpenSaveMenu={openSaveMenuUnder}
        onOpenGallery={() => setGalleryOpen(true)}
        onOpenMap={() => setMapOpen(true)}
        // A relative or an ancestor is its own page now, with its own URL.
        onOpenCreature={(id) => router.push(`/creature/${id}`)}
        onDiscard={discard}
      />

      {saveAnchor ? (
        <SaveMenu
          groups={library.groups}
          memberOf={memberOf}
          anchor={saveAnchor}
          onToggle={toggleSaveInto}
          onCreateAndSave={(group) => {
            library.addGroup(group);
            toggleSaveInto(group);
          }}
          onClose={closeSaveMenu}
        />
      ) : null}

      {galleryOpen ? (
        <GalleryOverlay creature={creature} onClose={() => setGalleryOpen(false)} />
      ) : null}
      {mapOpen ? <MapOverlay creature={creature} onClose={() => setMapOpen(false)} /> : null}

      {toast.message ? (
        <div className="toast" role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

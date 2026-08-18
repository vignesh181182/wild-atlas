'use client';

/**
 * Wild Atlas — the whole app is one screen with five states, exactly as the
 * design lays it out: the surprise, the quiet resting state, search results, a
 * creature's page, and a saved group. The surprise is a creature's page too:
 * there is only ever one on offer, so it opens read-to-hand rather than behind
 * a teaser.
 *
 * This file owns the navigation between those states and nothing else. Data
 * fetching lives in hooks/, the saved library in hooks/useLibrary, and every
 * pixel of layout in components/ + app/globals.css.
 *
 * It is mounted by app/page.tsx, which is the server component that checks
 * there is somebody signed in before any of this renders.
 */

import { useUser } from '@clerk/nextjs';
import { useCallback, useRef, useState } from 'react';
import { DetailView } from '@/components/DetailView';
import { GalleryOverlay } from '@/components/GalleryOverlay';
import { LibraryView } from '@/components/LibraryView';
import { MapOverlay } from '@/components/MapOverlay';
import { QuietView } from '@/components/QuietView';
import { ResultsView } from '@/components/ResultsView';
import { SaveMenu } from '@/components/SaveMenu';
import { SearchBar } from '@/components/SearchBar';
import { Sidebar } from '@/components/Sidebar';
import { useCreature } from '@/hooks/useCreature';
import { ALL_GROUP, useLibrary } from '@/hooks/useLibrary';
import { useSearch } from '@/hooks/useSearch';
import { useSurprise } from '@/hooks/useSurprise';
import { useToast } from '@/hooks/useToast';
import { toStoredSummary } from '@/lib/summary';
import type { CreatureSummary, View } from '@/lib/types';

export function WildAtlas() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('surprise');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [saveAnchor, setSaveAnchor] = useState<{ top: number; right: number } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const saveMenuOpen = saveAnchor !== null;
  const closeSaveMenu = useCallback(() => setSaveAnchor(null), []);

  /**
   * The menu is absolutely positioned inside the main column, but the button
   * that opens it sits in a scrolling child. Convert the button's viewport box
   * into main-column coordinates so the panel hangs just beneath it.
   */
  function openSaveMenuUnder(button: DOMRect) {
    if (saveMenuOpen) {
      closeSaveMenu();
      return;
    }
    const main = mainRef.current?.getBoundingClientRect();
    if (!main) return;
    setSaveAnchor({
      top: button.bottom - main.top + 8,
      right: Math.max(main.right - button.right, 16),
    });
  }

  // Everything kept belongs to whoever is signed in. Until Clerk has resolved
  // that, both stores hold off rather than opening somebody else's notebook.
  const { user } = useUser();
  const accountId = user?.id ?? null;

  const library = useLibrary(accountId);
  const search = useSearch(query);
  const surprise = useSurprise(accountId);
  const selected = useCreature(view === 'detail' ? selectedId : null);
  const toast = useToast();

  /**
   * Where "back" and "discard" land when there is no search to return to: the
   * surprise itself while it is still waiting, the quiet state once it has
   * been dealt with and the next one is a day off.
   */
  const restingView: View = surprise.settled ? 'quiet' : 'surprise';

  /** Nothing floating survives a change of page. */
  const closeOverlays = useCallback(() => {
    setSaveAnchor(null);
    setGalleryOpen(false);
    setMapOpen(false);
  }, []);

  const openCreature = useCallback(
    (id: number) => {
      setSelectedId(id);
      setView('detail');
      closeOverlays();
    },
    [closeOverlays],
  );

  function onQueryChange(next: string) {
    setQuery(next);
    if (view === 'detail') return; // keep reading; the results are still there
    setView(next.trim() ? 'results' : restingView);
  }

  function clearSearch() {
    setQuery('');
    setView(restingView);
  }

  function goBack() {
    closeOverlays();
    setView(query.trim() ? 'results' : restingView);
  }

  function selectGroup(group: string) {
    setActiveGroup(group);
    setView('library');
    closeOverlays();
  }

  function openSurprise() {
    setQuery('');
    setView(restingView);
    closeOverlays();
  }

  /** The creature the page is about right now — the surprise counts as one. */
  const onScreen =
    view === 'detail' ? selected.data : view === 'surprise' ? surprise.creature : null;
  const isSurprise = onScreen !== null && onScreen.id === surprise.creature?.id;

  /**
   * "Discard" throws the creature away: it leaves every group and we step
   * back. Done to the surprise, it also settles it — that is the whole point
   * of the button there.
   */
  function discardOnScreen() {
    if (!onScreen) return;
    library.forget(onScreen.id);
    closeOverlays();

    // Discarding the surprise is one of the two ways to settle it, so the next
    // one is now a day off. `restingView` still reads the old flag this tick,
    // so choose where to land explicitly.
    if (isSurprise) {
      surprise.settle();
      setView(query.trim() ? 'results' : 'quiet');
      toast.flash('Surprise discarded — a new one arrives tomorrow');
      return;
    }
    toast.flash(`${onScreen.name} discarded — nothing kept`);
    goBack();
  }

  function toggleSaveInto(group: string) {
    const creature = onScreen;
    if (!creature) return;
    const result = library.toggleSave(toStoredSummary(creature), group);
    // Keeping the surprise settles it too — it has found its home.
    const settles = result === 'added' && isSurprise && !surprise.settled;
    if (settles) surprise.settle();
    toast.flash(
      result === 'added'
        ? settles
          ? `Saved ${creature.name} to “${group}” — your next surprise arrives tomorrow`
          : `Saved ${creature.name} to “${group}” — it will stay in your groups`
        : `Removed ${creature.name} from “${group}”`,
    );
  }

  function createGroupAndSave(group: string) {
    library.addGroup(group);
    toggleSaveInto(group);
  }

  const showingAll = activeGroup === ALL_GROUP;
  const onScreenGroups = onScreen ? library.groupsOf(onScreen.id) : [];
  const suggestions = (search.data ?? []).slice(0, 5);

  return (
    <div className="app">
      <Sidebar
        library={library}
        activeGroup={view === 'library' ? activeGroup : null}
        onSelectGroup={selectGroup}
        onOpenSurprise={openSurprise}
        surpriseActive={view === 'surprise' || view === 'quiet'}
        surpriseUnread={!surprise.settled}
        onNotify={toast.flash}
      />

      <main className="main" ref={mainRef}>
        <div className="topbar">
          <SearchBar
            value={query}
            onChange={onQueryChange}
            onClear={clearSearch}
            suggestions={suggestions}
            onPick={(creature: CreatureSummary) => openCreature(creature.id)}
          />
        </div>

        {/* Only ever one surprise on offer, so it opens as its own page rather
            than as a teaser to click through. */}
        {view === 'surprise' ? (
          surprise.loading ? (
            <div className="status-note">Finding something for you…</div>
          ) : surprise.error ? (
            <div className="view">
              <div className="empty-note">{surprise.error}</div>
            </div>
          ) : surprise.creature ? (
            <DetailView
              creature={surprise.creature}
              eyebrow="Today’s surprise"
              savedCount={onScreenGroups.length}
              onOpenSaveMenu={openSaveMenuUnder}
              onOpenGallery={() => setGalleryOpen(true)}
              onOpenMap={() => setMapOpen(true)}
              onOpenCreature={openCreature}
              onDiscard={discardOnScreen}
            />
          ) : null
        ) : null}

        {view === 'quiet' ? <QuietView note="Your next surprise arrives tomorrow." /> : null}

        {view === 'results' ? (
          <ResultsView
            query={query.trim()}
            results={search.data}
            loading={search.loading}
            error={search.error}
            isSaved={library.isSaved}
            onOpen={(creature) => openCreature(creature.id)}
            onClear={clearSearch}
          />
        ) : null}

        {view === 'detail' ? (
          selected.loading ? (
            <div className="status-note">Reading up on it…</div>
          ) : selected.error ? (
            <div className="view">
              <button type="button" className="btn-quiet" onClick={goBack}>
                Back
              </button>
              <div className="empty-note" style={{ marginTop: 'var(--space-4)' }}>
                {selected.error}
              </div>
            </div>
          ) : selected.data ? (
            <DetailView
              creature={selected.data}
              savedCount={onScreenGroups.length}
              backLabel={query.trim() ? 'Back to results' : 'Back'}
              onBack={goBack}
              onOpenSaveMenu={openSaveMenuUnder}
              onOpenGallery={() => setGalleryOpen(true)}
              onOpenMap={() => setMapOpen(true)}
              onOpenCreature={openCreature}
              onDiscard={discardOnScreen}
            />
          ) : null
        ) : null}

        {view === 'library' && activeGroup ? (
          <LibraryView
            title={showingAll ? 'All' : activeGroup}
            rows={library.rowsIn(activeGroup)}
            emptyNote={
              showingAll
                ? 'Nothing kept yet — search for a creature and save it to a group.'
                : 'Nothing in this group yet — search for a creature and save it here.'
            }
            onOpen={openCreature}
            onRemove={(creatureId) => {
              // In "All" there is no one group to leave, so removing means
              // the creature is no longer kept at all.
              if (showingAll) {
                library.forget(creatureId);
                toast.flash('Removed — no longer kept in any group');
                return;
              }
              library.removeFromGroup(creatureId, activeGroup);
              toast.flash(`Removed from “${activeGroup}”`);
            }}
          />
        ) : null}

        {saveAnchor && onScreen ? (
          <SaveMenu
            groups={library.groups}
            memberOf={onScreenGroups}
            anchor={saveAnchor}
            onToggle={toggleSaveInto}
            onCreateAndSave={createGroupAndSave}
            onClose={closeSaveMenu}
          />
        ) : null}

        {galleryOpen && onScreen ? (
          <GalleryOverlay creature={onScreen} onClose={() => setGalleryOpen(false)} />
        ) : null}

        {mapOpen && onScreen ? (
          <MapOverlay creature={onScreen} onClose={() => setMapOpen(false)} />
        ) : null}

        {toast.message ? (
          <div className="toast" role="status">
            {toast.message}
          </div>
        ) : null}
      </main>
    </div>
  );
}

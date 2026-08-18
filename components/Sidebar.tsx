'use client';

import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState } from 'react';
import emblem from '@/public/wild-atlas-logo-emb.png';
import { ALL_GROUP, type Library } from '@/hooks/useLibrary';
import { PencilIcon, StarIcon, TrashIcon } from './icons';

type SidebarProps = {
  library: Library;
  /** The group currently on screen, or null when we're not in the library. */
  activeGroup: string | null;
  onSelectGroup: (group: string) => void;
  onOpenSurprise: () => void;
  /** True while the surprise is the view on screen. */
  surpriseActive: boolean;
  surpriseUnread: boolean;
  onNotify: (message: string) => void;
};

export function Sidebar({
  library,
  activeGroup,
  onSelectGroup,
  onOpenSurprise,
  surpriseActive,
  surpriseUnread,
  onNotify,
}: SidebarProps) {
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newGroup, setNewGroup] = useState('');

  function startRename(group: string) {
    setRenaming(group);
    setDraft(group);
  }

  function commitRename() {
    if (renaming === null) return;
    const next = draft.trim();
    const previous = renaming;
    setRenaming(null);
    setDraft('');
    if (!next || next === previous) return;
    library.renameGroup(previous, next);
    onNotify(`Renamed to “${next}”`);
  }

  function addGroup() {
    const name = newGroup.trim();
    if (!name) return;
    const added = library.addGroup(name);
    setNewGroup('');
    onNotify(added ? `Group “${name}” added` : `“${name}” already exists`);
  }

  function deleteGroup(group: string) {
    library.deleteGroup(group);
    onNotify(`Group “${group}” deleted — its creatures are no longer kept`);
  }

  return (
    <aside className="sidebar">
      {/* The emblem alone here — the sidebar already sets the name in type,
          and the full lockup would repeat it at a size too small to read. */}
      <h1 className="brand">
        <Image src={emblem} alt="" aria-hidden sizes="34px" />
        Wild Atlas
      </h1>

      <button
        type="button"
        className="surprise-btn"
        aria-current={surpriseActive}
        data-unread={surpriseUnread}
        onClick={onOpenSurprise}
      >
        <StarIcon />
        Today&rsquo;s surprise
        {surpriseUnread ? <span className="surprise-dot" aria-label="unread" /> : null}
      </button>

      <div className="sidebar-section">
        <div className="section-head">
          <span className="section-label">Groups</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setEditing((e) => !e);
              setRenaming(null);
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>

        <div className="group-list">
          {/* Everything kept, whichever group it is in. Not editable — it is
              not a group the user made. */}
          <div className="group-row">
            <button
              type="button"
              className="group-btn"
              aria-current={activeGroup === ALL_GROUP}
              onClick={() => onSelectGroup(ALL_GROUP)}
            >
              <span className="group-name">All</span>
              <span className="group-count">{library.saved.length || '—'}</span>
            </button>
          </div>

          {library.groups.map((group) => {
            const count = library.countIn(group);
            return (
              <div className="group-row" key={group}>
                {renaming === group ? (
                  <input
                    className="rename-input"
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') {
                        setRenaming(null);
                        setDraft('');
                      }
                    }}
                    aria-label={`Rename ${group}`}
                  />
                ) : (
                  <button
                    type="button"
                    className="group-btn"
                    aria-current={activeGroup === group}
                    onClick={() => onSelectGroup(group)}
                  >
                    <span className="group-name">{group}</span>
                    <span className="group-count">{count || '—'}</span>
                  </button>
                )}

                {editing ? (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      data-tip={`Rename ${group}`}
                      data-tip-place="left"
                      aria-label={`Rename ${group}`}
                      onClick={() => startRename(group)}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn is-danger"
                      data-tip={`Delete ${group}`}
                      data-tip-place="left"
                      aria-label={`Delete ${group}`}
                      onClick={() => deleteGroup(group)}
                    >
                      <TrashIcon />
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="add-group">
          <input
            value={newGroup}
            placeholder="New group"
            aria-label="New group name"
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addGroup();
            }}
          />
          <button
            type="button"
            data-tip="Add group"
            data-tip-place="left"
            aria-label="Add group"
            onClick={addGroup}
          >
            +
          </button>
        </div>
      </div>

      {/* Whose notebook this is, and the way out of it. Sits at the foot of
          the column, below whatever the groups list grows to. */}
      <div className="account">
        <UserButton
          showName
          appearance={{
            elements: {
              rootBox: { width: '100%' },
              userButtonTrigger: { width: '100%', justifyContent: 'flex-start' },
              // Clerk puts the name before the avatar; in a sidebar row the
              // avatar wants to lead, in line with every other row above it.
              userButtonBox: {
                width: '100%',
                flexDirection: 'row-reverse',
                // Reversed, so flex-end is the left-hand edge of the row.
                justifyContent: 'flex-end',
                gap: '9px',
              },
              userButtonOuterIdentifier: { fontSize: '14px' },
            },
          }}
        />
      </div>
    </aside>
  );
}

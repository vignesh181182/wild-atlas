'use client';

import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState } from 'react';
import emblem from '@/assets/wild-atlas-logo-emb.png';
import { ALL_GROUP, type Library } from '@/features/library/useLibrary';
import { PencilIcon, StarIcon, TrashIcon } from '@/components/icons';

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
  /** Folds the column back to the rail. Absent below the breakpoint, where
      there is no rail to fold to. */
  onCollapse?: () => void;
};

/**
 * A group and how much is in it, for the narrow-screen dropdown. An empty one
 * is left bare rather than labelled "(0)" — the chips beside it say the same
 * thing with an em dash, and a nought invites you to wonder what is missing.
 */
function withCount(name: string, count: number) {
  return count ? `${name} (${count})` : name;
}

export function Sidebar({
  library,
  activeGroup,
  onSelectGroup,
  onOpenSurprise,
  surpriseActive,
  surpriseUnread,
  onNotify,
  onCollapse,
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
      <div className="brand-row">
        <h1 className="brand">
          <Image src={emblem} alt="" aria-hidden sizes="34px" />
          Wild Atlas
        </h1>
        {onCollapse ? (
          <button
            type="button"
            className="icon-btn brand-collapse"
            onClick={onCollapse}
            aria-label="Collapse the menu"
            data-tip="Collapse the menu"
            data-tip-place="left"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
          </button>
        ) : null}
      </div>

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

      <div className="sidebar-section" data-editing={editing}>
        {/* Narrow screens get a dropdown instead of the row of chips: the row
            could only be scrolled sideways, which put every group past the
            third one off the edge with nothing to say it was there. The chip
            row is still what "Edit" opens, since renaming and deleting need a
            row each to hang the buttons off. */}
        <select
          className="group-select"
          aria-label="Choose a group"
          data-chosen={activeGroup !== null}
          value={activeGroup ?? ''}
          onChange={(e) => {
            if (e.target.value) onSelectGroup(e.target.value);
          }}
        >
          <option value="" disabled>
            Groups
          </option>
          <option value={ALL_GROUP}>{withCount('All', library.saved.length)}</option>
          {library.groups.map((group) => (
            <option key={group} value={group}>
              {withCount(group, library.countIn(group))}
            </option>
          ))}
        </select>

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

      {/* A notebook is kept in this browser and nowhere else, which is easy
          not to realise until it matters — a new machine, a cleared cache. So
          the way to take a copy is offered here rather than left to be asked
          for, at the foot of the column beside whose notebook it is. */}
      <a className="notebook-link" href="/transfer">
        Save a copy of your notebook
      </a>

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

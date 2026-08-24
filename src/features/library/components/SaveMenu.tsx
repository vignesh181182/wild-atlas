'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';

type SaveMenuProps = {
  groups: string[];
  /** Groups this creature is already filed under. */
  memberOf: string[];
  /** Where to hang the panel, in pixels from the top/right of the main column. */
  anchor: { top: number; right: number };
  onToggle: (group: string) => void;
  onCreateAndSave: (group: string) => void;
  onClose: () => void;
};

export function SaveMenu({
  groups,
  memberOf,
  anchor,
  onToggle,
  onCreateAndSave,
  onClose,
}: SaveMenuProps) {
  const [newGroup, setNewGroup] = useState('');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    function onPointerDown(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener('keydown', onKey);
    // Deferred so the click that opened the menu doesn't immediately close it.
    const id = setTimeout(() => document.addEventListener('pointerdown', onPointerDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  function create() {
    const name = newGroup.trim();
    if (!name) return;
    setNewGroup('');
    onCreateAndSave(name);
  }

  return (
    <div
      className="save-menu"
      ref={panel}
      role="dialog"
      aria-label="Save into a group"
      style={{ top: anchor.top, right: anchor.right }}
    >
      <div className="save-menu-head">
        <span className="section-label">Save into a group</span>
        <button
          type="button"
          className="close-x"
          data-tip="Close (Esc)"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon size={15} />
        </button>
      </div>

      <div className="save-menu-options">
        {groups.map((group) => {
          const checked = memberOf.includes(group);
          return (
            <button
              type="button"
              className="save-option"
              key={group}
              data-checked={checked}
              aria-pressed={checked}
              onClick={() => onToggle(group)}
            >
              <span className="mark">{checked ? '✓' : ''}</span>
              {group}
            </button>
          );
        })}
        {groups.length === 0 ? (
          <p className="page-meta" style={{ padding: '8px 4px' }}>
            No groups yet — make one below.
          </p>
        ) : null}
      </div>

      <div className="add-group">
        <input
          value={newGroup}
          placeholder="New group"
          aria-label="New group name"
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
        />
        <button
          type="button"
          data-tip="Add group and save into it"
          aria-label="Add group and save"
          onClick={create}
        >
          +
        </button>
      </div>
    </div>
  );
}

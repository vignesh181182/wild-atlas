'use client';

import type { SavedCreature } from '@/lib/types';
import { Plate } from '@/features/creatures/components/Plate';
import { OpenIcon, TrashIcon } from '@/components/icons';

type LibraryViewProps = {
  /** What the page is called — a group's name, or "All". */
  title: string;
  rows: SavedCreature[];
  /** Shown in place of the rows when there are none. */
  emptyNote: string;
  onOpen: (creatureId: number) => void;
  onRemove: (creatureId: number) => void;
};

export function LibraryView({ title, rows, emptyNote, onOpen, onRemove }: LibraryViewProps) {
  return (
    <div className="view">
      <div className="page-head">
        <h2 className="page-title">{title}</h2>
        <span className="page-meta">
          {rows.length} {rows.length === 1 ? 'creature' : 'creatures'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty-note">{emptyNote}</div>
      ) : (
        <div className="rows">
          {rows.map(({ creature, groups }) => (
            <div className="row" key={creature.id}>
              {/* The whole row opens the creature. A transparent button laid
                  over it does the work, so it stays a real button — focusable,
                  and announced as one — without nesting Remove inside it. */}
              <button
                type="button"
                className="row-open"
                aria-label={`Open ${creature.name}`}
                onClick={() => onOpen(creature.id)}
              />

              <Plate
                src={creature.thumbUrl}
                alt={creature.name}
                variant="row"
                caption={null}
              />
              <div className="row-main">
                <div className="row-name">
                  <span>{creature.name}</span>
                  {creature.extinct ? <span className="pill-extinct">Extinct</span> : null}
                </div>
                <div className="row-tagline">
                  {creature.kind} · in {groups.join(', ')}
                </div>
              </div>
              <button
                type="button"
                className="btn-icon row-remove"
                data-tip={`Remove ${creature.name}`}
                data-tip-place="left"
                aria-label={`Remove ${creature.name}`}
                onClick={() => onRemove(creature.id)}
              >
                <TrashIcon size={16} />
              </button>

              {/* Not a button — the row already is one. This just points. */}
              <span className="row-arrow" aria-hidden="true">
                <OpenIcon />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

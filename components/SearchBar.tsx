'use client';

import { useEffect, useRef, useState } from 'react';
import type { CreatureSummary } from '@/lib/types';
import { SearchIcon } from './icons';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** Top few matches, shown as you type. */
  suggestions: CreatureSummary[];
  onPick: (creature: CreatureSummary) => void;
};

export function SearchBar({ value, onChange, onClear, suggestions, onPick }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close the dropdown on a click anywhere else, rather than on blur — a blur
  // handler fires before the click on a suggestion lands.
  useEffect(() => {
    function onDocumentPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, []);

  useEffect(() => setActive(-1), [suggestions]);

  const visible = open && value.trim().length > 0 && suggestions.length > 0;

  function choose(index: number) {
    const creature = suggestions[index];
    if (!creature) return;
    setOpen(false);
    onPick(creature);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!visible) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div className="search" ref={wrapper}>
      <div className="search-field">
        <SearchIcon />
        {/* Deliberately type="text": a search input adds the browser's own
            clear button, which would sit next to ours. */}
        <input
          type="text"
          value={value}
          placeholder="Search any living thing — animal, bird, insect, plant, extinct"
          aria-label="Search any living thing"
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls="search-suggestions"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value ? (
          <button
            type="button"
            className="search-clear"
            data-tip="Clear search"
            data-tip-place="left"
            aria-label="Clear search"
            onClick={() => {
              setOpen(false);
              onClear();
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {visible ? (
        <div className="suggestions" id="search-suggestions" role="listbox">
          {suggestions.map((creature, index) => (
            <button
              type="button"
              key={creature.id}
              className="suggestion"
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span className="suggestion-name">{creature.name}</span>
              <span className="suggestion-kind">{creature.kind}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

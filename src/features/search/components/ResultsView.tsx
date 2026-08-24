'use client';

import type { CreatureSummary } from '@/lib/types';
import { Plate } from '@/features/creatures/components/Plate';
import { BookmarkIcon } from '@/components/icons';

type ResultsViewProps = {
  query: string;
  results: CreatureSummary[] | null;
  loading: boolean;
  error: string | null;
  isSaved: (id: number) => boolean;
  onOpen: (creature: CreatureSummary) => void;
  onClear: () => void;
};

export function ResultsView({
  query,
  results,
  loading,
  error,
  isSaved,
  onOpen,
  onClear,
}: ResultsViewProps) {
  const count = results?.length ?? 0;

  return (
    <div className="view">
      <div className="page-head">
        <h2 className="page-title">Results for “{query}”</h2>
        <span className="page-meta">
          {loading ? 'searching…' : `${count} ${count === 1 ? 'match' : 'matches'}`}
        </span>
        <button type="button" className="btn-quiet" onClick={onClear}>
          Discard results
        </button>
      </div>

      {error ? <div className="empty-note">{error}</div> : null}

      {loading && !results ? <ResultsSkeleton /> : null}

      {!loading && !error && results && results.length === 0 ? (
        <div className="empty-note">Nothing found — try another name.</div>
      ) : null}

      {results && results.length > 0 ? (
        <div className="result-grid">
          {results.map((creature) => (
            <button
              type="button"
              className="result"
              key={creature.id}
              onClick={() => onOpen(creature)}
            >
              <Plate
                src={creature.thumbUrl}
                alt={creature.name}
                variant="card"
                caption={null}
              />
              <div className="result-name">
                <span>{creature.name}</span>
                {creature.extinct ? <span className="pill-extinct">Extinct</span> : null}
                {isSaved(creature.id) ? (
                  <span className="saved-mark" data-tip="In your groups">
                    <BookmarkIcon size={14} filled />
                  </span>
                ) : null}
              </div>
              <div className="result-sub">{creature.scientificName}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="result-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="result" key={i}>
          <div className="plate plate-card skeleton" />
          <div className="skeleton" style={{ height: 20, width: '70%' }} />
          <div className="skeleton" style={{ height: 13, width: '50%' }} />
        </div>
      ))}
    </div>
  );
}

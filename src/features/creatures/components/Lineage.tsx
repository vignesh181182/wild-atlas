/**
 * The lineage as a spine: kingdom at the top, this creature at the foot, each
 * step a taxon of its own that the reader can step sideways into. Drawn as a
 * thread with a bead on every rank, because that is what it is — one branch of
 * one very old tree.
 */

import type { Ancestor, CreatureDetail } from '@/lib/types';

type LineageProps = {
  ancestry: Ancestor[];
  /** Shown as the last bead, and the only one that isn't a link. */
  creature: CreatureDetail;
  onOpen: (id: number) => void;
};

export function Lineage({ ancestry, creature, onOpen }: LineageProps) {
  return (
    <ol className="lineage">
      {ancestry.map((ancestor) => (
        <li className="lineage-step" key={ancestor.id}>
          <button type="button" onClick={() => onOpen(ancestor.id)}>
            <span className="lineage-rank">{ancestor.rank}</span>
            <span className="lineage-name">{ancestor.commonName ?? ancestor.name}</span>
            {ancestor.commonName ? <span className="lineage-sci">{ancestor.name}</span> : null}
          </button>
        </li>
      ))}

      <li className="lineage-step is-here">
        <div>
          <span className="lineage-rank">Here</span>
          <span className="lineage-name">{creature.name}</span>
          <span className="lineage-sci">{creature.scientificName}</span>
        </div>
      </li>
    </ol>
  );
}

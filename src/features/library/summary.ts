import type { CreatureDetail, CreatureSummary } from '@/lib/types';

/**
 * Narrows a full creature page down to the handful of fields worth keeping.
 * Saving the whole detail object would put photo lists and article text into
 * localStorage for every creature the user ever filed.
 */
export function toStoredSummary(creature: CreatureDetail | CreatureSummary): CreatureSummary {
  return {
    id: creature.id,
    name: creature.name,
    scientificName: creature.scientificName,
    kind: creature.kind,
    rank: creature.rank,
    extinct: creature.extinct,
    conservationStatus: creature.conservationStatus,
    thumbUrl: creature.thumbUrl,
    observations: creature.observations,
  };
}

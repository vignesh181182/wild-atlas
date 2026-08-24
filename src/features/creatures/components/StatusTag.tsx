/**
 * How the creature is faring, in the one place a reader looks for it.
 *
 * The palette here is sepia and one amber accent, so the tone is carried by
 * weight rather than by colour: the safer it is, the quieter the tag.
 */

import type { CreatureDetail } from '@/lib/types';

export type Tone = 'gone' | 'risk' | 'watch' | 'ok' | 'unknown';

const TONES: [RegExp, Tone][] = [
  [/^extinct/i, 'gone'],
  [/^(critically endangered|endangered|vulnerable)/i, 'risk'],
  [/^(near threatened|too little known)/i, 'watch'],
  [/^least concern/i, 'ok'],
];

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'unknown';
  return TONES.find(([pattern]) => pattern.test(status))?.[1] ?? 'unknown';
}

export function StatusTag({ creature }: { creature: CreatureDetail }) {
  const status = creature.extinct ? 'Extinct' : (creature.conservationStatus ?? 'Not evaluated');
  return (
    <span className="tag tag-status" data-tone={statusTone(status)}>
      <span className="status-dot" data-tone={statusTone(status)} />
      {status}
    </span>
  );
}

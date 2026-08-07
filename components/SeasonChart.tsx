/**
 * When in the year the creature is about, read off the sightings people have
 * logged: the summer spike of an insect, the winter trough of a hibernator,
 * the twin peaks of something that passes through twice on migration.
 */

import { MONTH_INITIALS, MONTH_NAMES } from '@/lib/months';

type SeasonChartProps = {
  /** Twelve counts, January first. */
  months: number[];
};

export function SeasonChart({ months }: SeasonChartProps) {
  const peak = Math.max(...months);
  if (!peak) return null;

  const busiest = months.indexOf(peak);
  const total = months.reduce((sum, count) => sum + count, 0);

  return (
    <div className="season">
      <div className="season-bars">
        {months.map((count, month) => (
          <div className="season-bar" key={month}>
            <div className="season-bar-track">
              <div
                className="season-bar-fill"
                data-peak={month === busiest}
                style={{ height: `${Math.round((count / peak) * 100)}%` }}
              />
            </div>
            <span className="season-bar-label" aria-hidden="true">
              {MONTH_INITIALS[month]}
            </span>
            <span className="sr-only">
              {MONTH_NAMES[month]}: {count.toLocaleString('en-GB')} sightings
            </span>
          </div>
        ))}
      </div>
      <p className="season-note">
        Most often seen in {MONTH_NAMES[busiest]}, across {total.toLocaleString('en-GB')} dated
        sightings. Northern-hemisphere observers dominate the record, so read summer as theirs.
      </p>
    </div>
  );
}

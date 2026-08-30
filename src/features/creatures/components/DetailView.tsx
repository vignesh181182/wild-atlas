'use client';

/**
 * A creature's page.
 *
 * The order is the order a reader wants it in: see it, learn what it is, then
 * the numbers, then where and when, then the prose, then where to go next.
 * Reference material — the lineage, the country-by-country status — sits in a
 * rail beside the reading column rather than interrupting it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { rankLabel } from '@/features/creatures/server/taxonomy';
import type { Tone } from '@/features/creatures/server/tone';
import type { CreatureDetail } from '@/lib/types';
import { Lineage } from '@/features/creatures/components/Lineage';
import { Plate } from '@/features/creatures/components/Plate';
import { RangeMap, fitToSightings } from '@/features/creatures/components/RangeMap';
import { SeasonChart } from '@/features/creatures/components/SeasonChart';
import { StatusTag, statusTone } from '@/features/creatures/components/StatusTag';
import {
  BackIcon,
  BookmarkIcon,
  GiftIcon,
  GridIcon,
  PlayIcon,
  StopIcon,
} from '@/components/icons';

type DetailViewProps = {
  creature: CreatureDetail;
  /** How many groups this creature is filed under. */
  savedCount: number;
  /** A line above the title, e.g. "Today's surprise". */
  eyebrow?: string;
  backLabel?: string;
  /** Omitted on the surprise page, where there is nothing behind this. */
  onBack?: () => void;
  /** Receives the Save button's on-screen box, so the menu can hang under it. */
  onOpenSaveMenu: (anchor: DOMRect) => void;
  onOpenGallery: () => void;
  onOpenMap: () => void;
  /** Opens another creature's page — an ancestor, or a relative. */
  onOpenCreature: (id: number) => void;
  /**
   * The photograph's own colour, for the panel the name sits on beside it.
   * Only used on a wide screen, where the two stand side by side; on a narrow
   * one the name lies over the photograph and the panel is not drawn.
   */
  tone?: Tone;
};

/** A group of creatures is "mammals"; a single one is "mammal". */
function isGroup(rank: string): boolean {
  return rank !== 'species' && rank !== 'subspecies';
}

/**
 * A one-line definition, assembled rather than quoted: what rank of what kind
 * of thing this is, where it sits, and who first wrote it down. It tells the
 * reader what they are looking at before the article starts talking.
 */
function definition(creature: CreatureDetail): string {
  const kind = creature.kind.toLowerCase();
  const family = creature.ancestry.find((a) => a.rank === 'Family');
  const place = family ? ` in the family ${family.commonName ?? family.name}` : '';
  const sentence = `A ${rankLabel(creature.rank).toLowerCase()} of ${
    isGroup(creature.rank) ? `${kind}s` : kind
  }${place}.`;
  // The year goes in the figures strip, so the sentence only needs the person.
  const author = creature.describedBy?.replace(/,?\s*\d{4}\s*$/, '');
  return author ? `${sentence} First described by ${author}.` : sentence;
}

export function DetailView({
  creature,
  savedCount,
  eyebrow,
  backLabel,
  onBack,
  onOpenSaveMenu,
  onOpenGallery,
  onOpenMap,
  onOpenCreature,
  tone,
}: DetailViewProps) {
  const hero = creature.photos[0] ?? null;
  const mapView = useMemo(() => fitToSightings(creature.sightings, 2.2), [creature.sightings]);

  /**
   * The headline numbers, in one strip. Whatever Wikidata knows about the body
   * comes first — it is what a reader asks about an animal they have never
   * seen — and the record's own size fills out the row.
   */
  const namedIn = creature.describedBy?.match(/\b(\d{4})\b/)?.[1];
  const figures = [
    ...creature.measurements,
    { label: 'Sightings logged', value: creature.observations.toLocaleString('en-GB') },
    ...(creature.speciesInGroup
      ? [{ label: 'Species in group', value: creature.speciesInGroup.toLocaleString('en-GB') }]
      : []),
    ...(namedIn ? [{ label: 'First described', value: namedIn }] : []),
  ].slice(0, 6);

  const sections = [
    { id: 'about', label: 'About', shown: true },
    { id: 'where', label: 'Where', shown: creature.sightings.length > 0 },
    { id: 'year', label: 'Year', shown: creature.months.length > 0 },
    { id: 'facts', label: 'Facts', shown: creature.facts.length > 0 },
    { id: 'more', label: 'Read further', shown: creature.sections.length > 0 },
    { id: 'family', label: 'Family', shown: creature.relatives.length > 0 },
  ].filter((section) => section.shown);

  return (
    <div
      className="view detail"
      id={`creature-${creature.id}`}
      /* On the page rather than on the hero: the facts sit beside the hero,
         not inside it, and need the same colours to inherit down to them. */
      style={
        tone
          ? ({
              '--tone-base': tone.base,
              '--tone-deep': tone.deep,
              '--tone-ink': tone.ink,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* The photograph is the page's front door: full bleed, unframed, with
          the name laid over it and the sheet of facts riding up underneath. */}
      <header className="hero">
        {hero ? (
          <img className="hero-photo" src={hero.url} alt={creature.name} />
        ) : (
          <div className="hero-photo is-empty" />
        )}
        <div className="hero-veil" />

        {onBack ? (
          <button
            type="button"
            className="hero-btn hero-back"
            data-tip={backLabel}
            aria-label={backLabel}
            onClick={onBack}
          >
            <BackIcon />
          </button>
        ) : null}

        {/* On the photograph, in its corners, as the design has them: what
            this is on one side, how many pictures there are on the other. */}
        {eyebrow ? (
          <span className="hero-chip hero-surprise">
            <GiftIcon size={16} />
            {eyebrow}
          </span>
        ) : null}

        {creature.photos.length > 1 ? (
          <button
            type="button"
            className="hero-chip hero-gallery"
            data-tip={`See all ${creature.photos.length} photographs`}
            data-tip-place="left"
            aria-label={`All ${creature.photos.length} photos`}
            onClick={onOpenGallery}
          >
            <GridIcon />
            <span>{creature.photos.length}</span>
          </button>
        ) : null}

        <div className="hero-text">
          <h2 className="hero-title">
            {creature.name}
            <span className="hero-sci">{creature.scientificName}</span>
          </h2>
          <p className="hero-definition">{definition(creature)}</p>
          {/* iNaturalist asks that the photographer travels with the
              photograph, so it sits in the flow rather than floating where it
              can collide with the words. */}
          {hero?.attribution ? <p className="hero-credit">{hero.attribution}</p> : null}
        </div>
      </header>

      {/* What the creature is, and its figures. It sits between the photograph
          and the reading so that either layout can have it: beneath the name
          on a wide screen, where the design puts it, and at the head of the
          sheet on a narrow one, where it already was. Moving it with CSS
          rather than rendering it twice keeps one copy for anything reading
          the page aloud. */}
      <section className="facts">
        {/* The tags and what you can do about the creature share a line, which
            is where the design has them: the pills run from the left, the
            actions keep the right-hand edge. `.tags` was already `flex: 1`
            and `.detail-actions` already `margin-left: auto` for exactly this
            row — they were only ever missing the wrapper. */}
        <div className="sheet-top">
          <div className="tags">
            <span className="tag">{creature.kind}</span>
            {/* "Species" is already said by the line under the title; a rank is
                only worth a tag when it is a group. */}
            {isGroup(creature.rank) ? (
              <span className="tag">{rankLabel(creature.rank)}</span>
            ) : null}
            <StatusTag creature={creature} />
            {creature.alsoCalled.length ? (
              <span className="tag tag-quiet">Also called {creature.alsoCalled.join(' · ')}</span>
            ) : null}
          </div>

          <div className="detail-actions">
            <SoundButton creature={creature} />
            <button
              type="button"
              className="btn-accent"
              data-filled={savedCount > 0}
              onClick={(event) => onOpenSaveMenu(event.currentTarget.getBoundingClientRect())}
            >
              <BookmarkIcon filled={savedCount > 0} />
              {savedCount ? `Saved · ${savedCount}` : 'Save'}
            </button>
          </div>
        </div>

        {figures.length >= 2 ? (
          <dl className="figures">
            {figures.map((figure) => (
              <div className="figure" key={figure.label}>
                <dd>{figure.value}</dd>
                <dt>{figure.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <div className="sheet">

      <SectionNav sections={sections} />

      <div className="detail-columns">
        <div className="detail-main">
          <section className="section" id="about">
            <h3>About them</h3>
            <div className="about-text">
              {creature.about.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>

          {creature.sightings.length ? (
            <section className="section" id="where">
              <h3>Where it has been seen</h3>
              <button type="button" className="map-open" onClick={onOpenMap}>
                <RangeMap sightings={creature.sightings} view={mapView} />
                <span className="map-open-hint">Open full screen</span>
              </button>
              <p className="map-caption">
                {creature.sightingsTotal > creature.sightings.length
                  ? `${creature.sightings.length.toLocaleString('en-GB')} sightings, sampled across the ${creature.sightingsTotal.toLocaleString('en-GB')} that carry a location.`
                  : `All ${creature.sightings.length.toLocaleString('en-GB')} sightings that carry a location.`}{' '}
                These are places people recorded it, not the whole range — the crowds follow the
                observers.
                {creature.rangeMapUrl ? ' A drawn range map sits inside the full-screen view.' : ''}
              </p>
            </section>
          ) : null}

          {creature.months.length ? (
            <section className="section" id="year">
              <h3>Through the year</h3>
              <SeasonChart months={creature.months} />
            </section>
          ) : null}

          {creature.facts.length ? (
            <section className="section" id="facts">
              <h3>Amazing facts</h3>
              <div className="facts-grid">
                {creature.facts.map((fact) => (
                  <div className="fact" key={fact.n}>
                    <span className="fact-n">{fact.n}</span>
                    <span>{fact.text}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* The rest of the article, folded away. The lead is what most
              readers want; these are for the one who wants more. */}
          {creature.sections.length ? (
            <section className="section" id="more">
              <h3>Read further</h3>
              <div className="chapters">
                {creature.sections.map((chapter) => (
                  <details className="chapter" key={chapter.heading}>
                    <summary>
                      <span>{chapter.heading}</span>
                    </summary>
                    <div className="about-text">
                      {chapter.paragraphs.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="detail-rail">
          {creature.ancestry.length ? (
            <div className="rail-block">
              <h3>Where it sits</h3>
              <Lineage ancestry={creature.ancestry} creature={creature} onOpen={onOpenCreature} />
            </div>
          ) : null}

          {creature.regionalStatuses.length ? (
            <div className="rail-block">
              <h3>How it is faring</h3>
              <ul className="statuses">
                {creature.regionalStatuses.map((status) => (
                  <li className="status-row" key={status.place}>
                    <span className="status-dot" data-tone={statusTone(status.status)} />
                    <span className="status-place">{status.place}</span>
                    <span className="status-value">{status.status}</span>
                  </li>
                ))}
              </ul>
              <p className="rail-note">
                Worldwide it is rated {(creature.conservationStatus ?? 'unassessed').toLowerCase()}.
                A place-by-place picture often looks nothing like the global one.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {creature.relatives.length ? (
        <section className="section" id="family">
          <h3>{creature.relativesRelation === 'inside' ? 'What is inside' : 'Close relatives'}</h3>
          <p className="section-note">
            {creature.relativesRelation === 'inside'
              ? `The most-recorded species in ${creature.relativesGroup}.`
              : `Others in ${creature.relativesGroup}, the nearest group it shares.`}
          </p>
          <div className="relatives">
            {creature.relatives.map((relative) => (
              <button
                type="button"
                className="relative"
                key={relative.id}
                onClick={() => onOpenCreature(relative.id)}
              >
                <Plate src={relative.thumbUrl} alt={relative.name} variant="card" caption={null} />
                <span className="relative-name">{relative.name}</span>
                <span className="relative-sci">{relative.scientificName}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

          <p className="credit">
          Photographs and taxonomy from{' '}
        <a href={creature.inaturalistUrl} target="_blank" rel="noreferrer noopener">
          iNaturalist
        </a>
        {creature.aboutSource === 'wikipedia' && creature.wikipediaUrl ? (
          <>
            {' · '}text from{' '}
            <a href={creature.wikipediaUrl} target="_blank" rel="noreferrer noopener">
              Wikipedia
            </a>{' '}
            (CC BY-SA)
          </>
        ) : null}
        {creature.measurements.length || creature.describedBy || creature.rangeMapUrl ? (
          <> · measurements and range map from Wikidata and Wikimedia Commons</>
        ) : null}
          . Each photograph is credited to its own photographer beneath it.
        </p>
      </div>
    </div>
  );
}

/**
 * A page this long needs a spine. The chips scroll to their section and light
 * up as it passes, so you always know how far in you are and what is left.
 */
function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    // The page scrolls inside `.view`, not the window, so the observer has to
    // be told to watch that box instead.
    const root = document.querySelector('.detail');
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!root || !targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { root, rootMargin: '-25% 0px -65% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 3) return null;

  return (
    <nav className="section-nav" aria-label="Sections of this page">
      {sections.map((section) => (
        <button
          type="button"
          key={section.id}
          data-active={active === section.id}
          onClick={() =>
            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

/** Plays a community recording of the animal, when iNaturalist has one. */
function SoundButton({ creature }: { creature: CreatureDetail }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Stop and tear down whenever we move to a different creature.
  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
      setPlaying(false);
    };
  }, [creature.id]);

  if (!creature.sound) {
    return (
      <button
        type="button"
        className="btn-icon"
        disabled
        data-tip="Nobody has recorded this one"
        aria-label="No recording for this one"
      >
        <PlayIcon size={15} />
      </button>
    );
  }

  function toggle() {
    if (!creature.sound) return;
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audio.current) {
      audio.current = new Audio(creature.sound.url);
      audio.current.addEventListener('ended', () => setPlaying(false));
      audio.current.addEventListener('error', () => setPlaying(false));
    }
    void audio.current.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  return (
    <button
      type="button"
      className="btn-icon"
      data-tip={playing ? 'Stop' : `Hear it — ${creature.sound.attribution}`}
      aria-label={playing ? 'Stop the recording' : 'Hear it'}
      onClick={toggle}
    >
      {playing ? <StopIcon size={15} /> : <PlayIcon size={15} />}
    </button>
  );
}

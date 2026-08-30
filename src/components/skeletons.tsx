/**
 * Stand-ins for content that has not arrived yet.
 *
 * Each one mirrors the markup of the thing it is standing in for and leans on
 * the same stylesheet, so the shapes and spacing are the real ones and nothing
 * moves when the content lands. That is the whole point of a skeleton over a
 * spinner: it says where things will be, not merely that something is
 * happening.
 *
 * All of them are `aria-hidden` and carry no text. A reader using a screen
 * reader is told the region is busy by whatever renders them; shimmering boxes
 * announced one by one would be noise.
 */

/** One shimmering block. `.skeleton` carries the shimmer and the radius. */
export function Shimmer({ width, height, radius }: { width?: number | string; height: number; radius?: number }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height, borderRadius: radius }} />;
}

/** The saved rows of a group, as `LibraryView` draws them. */
export function LibraryRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row" key={i}>
          <div className="plate plate-row skeleton" />
          <div className="row-main">
            {/* Varied widths, so it reads as a list of different names rather
                than a stack of identical bars. */}
            <Shimmer height={19} width={`${52 + ((i * 13) % 30)}%`} />
            <div style={{ height: 6 }} />
            <Shimmer height={13} width={`${34 + ((i * 7) % 22)}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The list of groups on the groups page. */
export function GroupIndexSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="group-index" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="group-index-row" key={i}>
          <Shimmer height={17} width={`${38 + ((i * 11) % 34)}%`} />
          <Shimmer height={17} width={26} />
        </div>
      ))}
    </div>
  );
}

/** The groups down the sidebar. */
export function SidebarGroupsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="group-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="group-row" key={i}>
          <Shimmer height={15} width={`${44 + ((i * 17) % 32)}%`} />
        </div>
      ))}
    </div>
  );
}

/**
 * A creature: the photograph, the tags and figures beneath it, and the first
 * of the reading. The hero keeps the real aspect ratio so the page does not
 * jump when the photograph arrives.
 */
export function CreatureSkeleton() {
  return (
    <div className="view detail" aria-hidden="true">
      <div className="hero skeleton" style={{ aspectRatio: '834 / 555' }} />

      <section className="facts">
        <div className="sheet-top">
          <div className="tags">
            <Shimmer height={30} width={92} radius={100} />
            <Shimmer height={30} width={108} radius={100} />
            <Shimmer height={30} width={76} radius={100} />
          </div>
        </div>
        <div className="figures">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="figure" key={i}>
              <Shimmer height={26} width={74} />
              <div style={{ height: 7 }} />
              <Shimmer height={13} width={96} />
            </div>
          ))}
        </div>
      </section>

      <div className="sheet">
        <Shimmer height={20} width={148} />
        <div style={{ height: 14 }} />
        {[100, 97, 99, 62].map((w, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <Shimmer height={14} width={`${w}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A whole page's worth, for a route that could be showing anything. */
export function PageSkeleton() {
  return (
    <div className="view" aria-hidden="true">
      <div className="page-head">
        <Shimmer height={30} width={188} />
      </div>
      <LibraryRowsSkeleton rows={5} />
    </div>
  );
}

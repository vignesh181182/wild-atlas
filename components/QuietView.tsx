/** The resting state: nothing searched, nothing selected. */
export function QuietView({ note }: { note: string }) {
  return (
    <div className="view-centred">
      <div className="headline">Search for any living thing</div>
      <div className="lede">
        Results are yours to browse. Save one into a group and it stays; discard it and it&rsquo;s
        gone with the next search.
      </div>
      <div className="footnote">{note}</div>
    </div>
  );
}

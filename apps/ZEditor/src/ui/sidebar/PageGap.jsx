// The hover gap between thumbnails that inserts a blank page.

// ---- Hover gap between (or around) thumbnails — reveals a line + a
// floating "+" to insert a blank page at that exact spot. Hover state
// is pure CSS (:hover), so no extra JS/state is needed for it.
export function PageGap({ onInsert }) {
  return (
    <div
      className="ze-page-gap"
      role="button"
      tabIndex={0}
      title="Add blank page"
      onClick={onInsert}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onInsert(); } }}
    >
      <div className="ze-page-gap-line" />
      <span className="ze-page-gap-btn" aria-hidden="true">+</span>
    </div>
  );
}

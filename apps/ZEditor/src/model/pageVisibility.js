// Hidden pages: a page can be marked hidden (`hidden: true`, the crossed-out eye on its thumbnail). It stays in the project and in the editor, but it is
// skipped by Export PDF, Send to ZineArranger, "all pages" exports, and by the page numbers (the pages after it count on as if it were not there). Pure.

export const isHiddenPage = (page) => Boolean(page && page.hidden);

// The indices of the pages that are exported and numbered, in order.
export const visibleIndices = (pages) => pages.map((_, i) => i).filter((i) => !isHiddenPage(pages[i]));

// Where page `idx` stands among the visible pages: { index (0-based), count }, or null for a hidden page or no page.
export function visibleSlot(pages, idx) {
  if (idx === null || idx === undefined || !pages[idx] || isHiddenPage(pages[idx])) return null;
  const visible = visibleIndices(pages);
  return { index: visible.indexOf(idx), count: visible.length };
}

// HTML text helpers: escaping and heading slugs.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------
 * buildDocumentParts
 * ------------------------------------------------------------------
 * Shared groundwork used by both renderHtmlDocument and exportToPdf so
 * the two never drift out of sync.
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------
 * applyToc(bodyHtml, normalized, tocPages)
 * ------------------------------------------------------------------
 * Gives every heading an id (keeping any it already has), then swaps
 * each `\toc` placeholder for a list of H1..H{tocLevels} that link to
 * them. Page numbers can't be known until pages are laid out, so the
 * number cells start empty: the Paged.js documents (preview and
 * rasterize) fill them in tocFillScript() below, and the print export
 * gets the numbers the preview measured, passed in as tocPages
 * ({ headingId: pageNumber }).
 * ------------------------------------------------------------------ */
export function slugify(text) {
  var s = String(text)
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .toLowerCase()
    .trim();
  try {
    s = s.replace(/[^\p{L}\p{N}]+/gu, '-');
  } catch (e) {
    s = s.replace(/[^a-z0-9\u00c0-\uffff]+/g, '-');
  }
  return s.replace(/^-+|-+$/g, '').slice(0, 60);
}

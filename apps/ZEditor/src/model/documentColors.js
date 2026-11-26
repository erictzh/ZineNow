// The colours a document already uses, for the colour picker's "In this document" swatches. Pure.
// Every "#rrggbb" text found anywhere in the page items (text, shapes, strokes, gradients, vectorized colours, filters) counts;
// the most used come first.

const HEX = /^#[0-9a-f]{6}$/i;

function scan(value, counts, depth) {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") {
    if (HEX.test(value)) { const k = value.toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); }
    return;
  }
  if (Array.isArray(value)) { for (const v of value) scan(v, counts, depth + 1); return; }
  if (typeof value === "object") for (const k of Object.keys(value)) scan(value[k], counts, depth + 1);
}

// pages: the document's pages. Returns up to `limit` colours as lower-case "#rrggbb", most used first (ties: first found).
export function collectDocumentColors(pages, limit = 12) {
  const counts = new Map();
  for (const page of pages || []) for (const ann of page.annotations || []) scan(ann, counts, 0);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([hex]) => hex);
}

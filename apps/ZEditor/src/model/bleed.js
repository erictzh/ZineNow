// Bleed: the strip of picture that runs past the trimmed edge of a page, so no white shows after cutting. Pure.
//
// A blank page stores `bleedMm` (default 0). Its `width`/`height` (pt) are the WHOLE page, bleed included, so everything
// that draws or exports a page keeps working; the trim rectangle is that minus the bleed on every side.

export const MAX_BLEED_MM = 25;
export const mmToPt = (mm) => (mm * 72) / 25.4;
export const ptToMm = (pt) => (pt * 25.4) / 72;

// A bleed typed in mm, made safe: a number from 0 to MAX_BLEED_MM, rounded to a tenth.
export function cleanBleedMm(value) {
  const v = Number(value);
  return Number.isFinite(v) ? Math.round(Math.min(MAX_BLEED_MM, Math.max(0, v)) * 10) / 10 : 0;
}

// The bleed of a page in pt (only blank pages have one).
export const bleedPt = (page) => (page && page.isBlank && page.bleedMm > 0 ? mmToPt(page.bleedMm) : 0);

// The page with its bleed set to `mm`: the whole page grows or shrinks by the change on every side.
// Returns { width, height, bleedMm, shiftPt }: `shiftPt` is how far the page's items move (right and down) to stay
// where they were relative to the trim.
export function withBleed(page, mm) {
  const next = cleanBleedMm(mm);
  const before = bleedPt(page), after = mmToPt(next);
  const grow = after - before;
  return { width: page.width + 2 * grow, height: page.height + 2 * grow, bleedMm: next, shiftPt: grow };
}

// The trim rectangle of a page in pt, from the page's own top-left: { x, y, width, height }.
export function trimRect(page) {
  const b = bleedPt(page);
  return { x: b, y: b, width: page.width - 2 * b, height: page.height - 2 * b };
}

// Crop mark lines for a page placed in a larger sheet, in PDF points (origin bottom-left). `b` is the bleed, `offset` is where
// the sheet's margin starts around the page (`pad` on every side). Each mark is [x1, y1, x2, y2]. Marks start `b + gap` away
// from the trim corner (outside the bleed) and run `len` further out.
export function cropMarkLines(trimW, trimH, b, pad, gap = 2, len = 14) {
  const x0 = pad + b, x1 = pad + b + trimW, y0 = pad + b, y1 = pad + b + trimH;
  const near = b + gap, far = b + gap + len;
  const lines = [];
  for (const x of [x0, x1]) { lines.push([x, y0 - near, x, y0 - far], [x, y1 + near, x, y1 + far]); }
  for (const y of [y0, y1]) { lines.push([x0 - near, y, x0 - far, y], [x1 + near, y, x1 + far, y]); }
  return lines;
}

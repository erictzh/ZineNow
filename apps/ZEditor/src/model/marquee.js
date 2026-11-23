// Marquee tool: the region on the page (rectangle or polygon), its settings, and the geometry the layer-making code uses.

import { rotatePoint } from "./geometry.js";

// The marquee and the Rectangle/Ellipse tools share the drag-out box (Shift = square, Alt = from the middle).
export { dragBox } from "./geometry.js";

// What the panel's settings mean:
// action:       "copy" = Layer via Copy (the source stays as it is), "cut" = Layer via Cut (the region is
//               taken out of the source).
// shape:        which marquee the next drag/click makes: "rect" or "polygon".
// source:       "visible" = everything you can see on the page; "layer" = only the selected layer.
// includePaper: with "visible", whether the paper (a blank page's white, a PDF page's white backing) is part
//               of the copy. Off leaves it transparent wherever only paper shows.
// cutLeaves:    what a cut leaves behind in an image: "transparent", "fill" (a solid colour) or "surround" (made
//               from the pixels round it, see fillStyle). Cutting from everything visible can only cover the
//               spot, so there it is "fill" or "surround".
// fillStyle:    how "surround" (and the Remove & fill button) fills: "smooth" (a blend of the edge colours, the
//               fell back to when pattern can't be used), "pattern" (the default) (texture copied from elsewhere in the picture) or "detail"; fillGrain: add noise like the surroundings' so the fill is not flat (lines and edges run on through it); render/inpaint.js.
// fillColor:    the colour of that fill (white, like paper).
export const MARQUEE_DEFAULTS = {
  mode: "layer", // which job the panel shows: "layer" (Make layer) or "fill" (Remove & fill)
  action: "copy",
  shape: "rect",
  source: "visible",
  includePaper: false,
  cutLeaves: "transparent",
  fillStyle: "pattern",
  fillGrain: true,
  fillMix: 100, // Pattern: how much of the result is the texture copy (the rest is the smooth blend), %
  fillPatch: 15, // Pattern: the size of the patches copied, px of the picture
  fillReach: 80, // Pattern: how far from the area it looks for texture to copy, px of the picture
  fillGrow: 0, // how much bigger than the marquee the filled area is, px of the picture
  fillGrainAmount: 100, // how much grain is added, % of what the picture has
  fillSeed: 0, // Pattern: another number picks other patches ("Try another")
  brushSize: 24, // Brush shape: the brush's width, page px
  brushErase: false, // Brush shape: true = painting rubs the marks out
  fillColor: "#ffffff",
};

export const MARQUEE_MIN_SIZE = 4; // page px: a rectangle smaller than this is a click, not a marquee
export const MIN_POLYGON_POINTS = 3;
export const POLYGON_CLOSE_PX = 10; // screen px: a click this close to a polygon's first point closes it
export const POLYGON_REPEAT_PX = 4; // screen px: a press this close to its last point is a repeat (a double click closes it)

// A marquee is one of
//   { kind: "rect", x, y, width, height, angle }   a box, turned `angle` degrees about its centre (like an item)
//   { kind: "polygon", points: [[x, y], ...], closed }
// in page px. `closed` is false while the polygon is still being drawn.
export function rectMarquee(box, angle = 0) {
  return { kind: "rect", x: box.x, y: box.y, width: box.width, height: box.height, angle };
}

// A brush marquee: the painted area, kept as the strokes that made it (page px), so it stays sharp at any zoom and in the export.
//   { kind: "brush", strokes: [{ erase, size, points: [[x, y], ...] }] }   strokes in the order they were made; an `erase` stroke
//   rubs out what the strokes before it painted.
export const BRUSH_MIN_SIZE = 2;
export const BRUSH_MAX_SIZE = 300;
export function brushRegion(strokes = []) { return { kind: "brush", strokes }; }
export function brushWithStroke(region, stroke) {
  const base = region && region.kind === "brush" ? region : brushRegion();
  return { ...base, strokes: [...base.strokes, stroke] };
}
// The box round everything painted (page px, brush width included), or null when nothing is painted.
export function brushBounds(m) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of m.strokes) {
    if (s.erase) continue;
    const r = s.size / 2;
    for (const [x, y] of s.points) { if (x - r < x0) x0 = x - r; if (x + r > x1) x1 = x + r; if (y - r < y0) y0 = y - r; if (y + r > y1) y1 = y + r; }
  }
  return x1 < x0 ? null : { x0, y0, x1, y1 };
}

// The marquee's outline as a list of points, whatever its shape (a rectangle gives its four corners; a brush gives the box round it).
export function regionPolygon(m) {
  if (m.kind === "brush") { const b = brushBounds(m); return b ? [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]] : []; }
  if (m.kind === "polygon") return m.points.map(([x, y]) => [x, y]);
  const cx = m.x + m.width / 2, cy = m.y + m.height / 2;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const [dx, dy] = rotatePoint(sx * m.width / 2, sy * m.height / 2, m.angle || 0);
    return [cx + dx, cy + dy];
  });
}

// The box around a list of points.
export function pointsBounds(points) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

// Whether (x, y) is inside the polygon (even-odd rule).
export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A marquee that can make a layer: a rectangle with some size, or a closed polygon of 3+ points.
export function isUsableMarquee(m) {
  if (!m) return false;
  if (m.kind === "brush") return m.strokes.some((s) => !s.erase) && brushBounds(m) !== null;
  if (m.kind === "polygon") return Boolean(m.closed) && m.points.length >= MIN_POLYGON_POINTS;
  return m.width >= MARQUEE_MIN_SIZE && m.height >= MARQUEE_MIN_SIZE;
}

export function translatedMarquee(m, dx, dy) {
  if (m.kind === "brush") return { ...m, strokes: m.strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => [x + dx, y + dy]) })) };
  if (m.kind === "polygon") return { ...m, points: m.points.map(([x, y]) => [x + dx, y + dy]) };
  return { ...m, x: m.x + dx, y: m.y + dy };
}

// The marquee turned `degrees` clockwise about (cx, cy). A rectangle keeps being a rectangle (its centre
// moves round and its angle grows); a polygon's points move.
export function rotatedMarquee(m, degrees, cx, cy) {
  if (m.kind === "brush") return { ...m, strokes: m.strokes.map((s) => ({ ...s, points: s.points.map(([x, y]) => { const [dx, dy] = rotatePoint(x - cx, y - cy, degrees); return [cx + dx, cy + dy]; }) })) };
  if (m.kind === "polygon") {
    return { ...m, points: m.points.map(([x, y]) => { const [dx, dy] = rotatePoint(x - cx, y - cy, degrees); return [cx + dx, cy + dy]; }) };
  }
  const [dx, dy] = rotatePoint(m.x + m.width / 2 - cx, m.y + m.height / 2 - cy, degrees);
  return { ...m, x: cx + dx - m.width / 2, y: cy + dy - m.height / 2, angle: (((m.angle || 0) + degrees) % 360 + 360) % 360 };
}

// A polygon being drawn: its first point, or a point added to it (a new marquee when there is no open one).
export function startPolygon(point) {
  return { kind: "polygon", points: [[point.x, point.y]], closed: false };
}
export function polygonWithPoint(m, point) {
  return { ...m, points: [...m.points, [point.x, point.y]] };
}
// What a press at `point` does to a polygon being drawn, with `pxPerUnit` screen px per page px:
//   "close"  it is on the first point (or on the last, i.e. a double click or tap) and there are enough points
//   "ignore" it is on the last point already (nothing to add)
//   "add"    anything else
export function polygonPressAction(m, point, pxPerUnit) {
  const near = ([x, y], px) => Math.hypot(point.x - x, point.y - y) * pxPerUnit <= px;
  const enough = m.points.length >= MIN_POLYGON_POINTS;
  if (enough && (near(m.points[0], POLYGON_CLOSE_PX) || near(m.points[m.points.length - 1], POLYGON_REPEAT_PX))) return "close";
  if (near(m.points[m.points.length - 1], POLYGON_REPEAT_PX)) return "ignore";
  return "add";
}

// The middle of the marquee's box: what a polygon turns about.
export function marqueeCenter(m) {
  if (m.kind === "brush") {
    const b = brushBounds(m);
    return b ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 } : { x: 0, y: 0 };
  }
  if (m.kind === "polygon") {
    const b = pointsBounds(m.points);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  return { x: m.x + m.width / 2, y: m.y + m.height / 2 };
}

// The page's items after a "make layer": the new layer goes straight above its source, or on top of
// everything when there is no single source. A cut from the source image's pixels patches it, and a cut
// from everything visible puts a cover under the new layer. `result` is what buildMarqueeLayer returns.
export function applyMarqueeResult(annotations, result, newId, coverId) {
  const hasSource = result.sourceId !== null && result.sourceId !== undefined;
  const list = annotations.map((a) => (hasSource && result.sourcePatch && a.id === result.sourceId ? { ...a, ...result.sourcePatch } : a));
  const at = hasSource ? list.findIndex((a) => a.id === result.sourceId) + 1 || list.length : list.length;
  const added = [];
  if (result.cover) added.push({ ...result.cover, id: coverId });
  if (result.layer) added.push({ ...result.layer, id: newId }); // none for "Remove & fill": the cover (or the patched layer) is all there is
  list.splice(at, 0, ...added);
  return list;
}

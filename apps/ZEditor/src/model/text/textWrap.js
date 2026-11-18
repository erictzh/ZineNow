// Text wrap: which page items push text aside, their outlines, and the free space left on a line.
//
// An image or shape with Text wrap set is an obstacle for every text frame it overlaps.
// Its outline (the bounding box, or the object's shape) is turned into polygons in the
// frame's own coordinates (editor px from the frame's top-left), stored on the laid-out
// frame as `wrapObstacles`; the composer then asks, line by line, where the widest free
// stretch is (`freeSlot`). Pure: the image's opaque rows come in from render/wrapShapes.js.

import { ptToPx } from "./textLook.js";

export const TEXT_WRAP_CONTROLS = [
  {
    kind: "select", prop: "textWrap", label: "Text wrap", fallback: "none",
    options: [{ key: "none", label: "None" }, { key: "box", label: "Around bounding box" }, { key: "shape", label: "Around object shape" }],
  },
  { kind: "slider", prop: "wrapOffset", label: "Wrap offset (pt)", min: 0, max: 72, fallback: 6 },
];

const ELLIPSE_STEPS = 48;
// A line narrower than this (in font sizes) is skipped: the text moves down past the object.
export const MIN_SLOT_EMS = 1.5;

export const wrapsText = (ann) => (ann.type === "image" || ann.type === "rect") && !ann.hidden && (ann.textWrap === "box" || ann.textWrap === "shape");

// A point of a box (bx, by from its top-left, unrotated) on the page, the box turned `angle` degrees clockwise about its centre.
function boxPointOnPage(box, angle, bx, by) {
  if (!angle) return [box.x + bx, box.y + by];
  const cx = box.width / 2, cy = box.height / 2;
  const r = angle * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const dx = bx - cx, dy = by - cy;
  return [box.x + cx + dx * cos - dy * sin, box.y + cy + dx * sin + dy * cos];
}

// The obstacle's outline on the page, as polygons ([[x, y], ...]). `rows` (optional) are the image's
// opaque rows from wrapShapes: [{ y0, y1, x0, x1 }] in the image's natural pixels.
export function wrapPolygons(ann, rows) {
  const angle = ann.angle || 0;
  const box = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
  const onPage = (pts) => pts.map(([bx, by]) => boxPointOnPage(box, angle, bx, by));
  const rect = (x0, y0, x1, y1) => onPage([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  if (ann.textWrap === "shape") {
    if (ann.shape === "ellipse" || ann.ellipseEdge) {
      const pts = [];
      for (let i = 0; i < ELLIPSE_STEPS; i++) {
        const t = (i / ELLIPSE_STEPS) * Math.PI * 2;
        pts.push([box.width / 2 + Math.cos(t) * box.width / 2, box.height / 2 + Math.sin(t) * box.height / 2]);
      }
      return [onPage(pts)];
    }
    if (ann.type === "image" && rows) {
      // Each opaque row of the shown (cropped) part becomes a thin rectangle.
      const natW = ann.naturalWidth || ann.width, natH = ann.naturalHeight || ann.height;
      const sx = ann.cropX || 0, sy = ann.cropY || 0;
      const sw = ann.cropW || natW, sh = ann.cropH || natH;
      const kx = box.width / sw, ky = box.height / sh;
      const out = [];
      for (const r of rows) {
        const y0 = Math.max(r.y0, sy), y1 = Math.min(r.y1, sy + sh);
        const x0 = Math.max(r.x0, sx), x1 = Math.min(r.x1, sx + sw);
        if (y1 <= y0 || x1 <= x0) continue;
        out.push(rect((x0 - sx) * kx, (y0 - sy) * ky, (x1 - sx) * kx, (y1 - sy) * ky));
      }
      return out;
    }
  }
  return [rect(0, 0, box.width, box.height)];
}

// The obstacles that touch text frame `frame` (a laid-out text annotation), in the frame's own
// coordinates, or null when none do. Frames that can't wrap (no set width, rotated, or using
// ransom/curve/stacked layout) get null. `rowsFor(ann)` gives an image's opaque rows (or null).
export function wrapObstaclesFor(frame, annotations, rowsFor) {
  if (frame.type !== "text" || !frame.width || frame.angle || frame.ransom || frame.curve || frame.vertical === "stacked") return null;
  const left = frame.x, right = frame.x + frame.width;
  const top = frame.y, bottom = frame.frameHeight > 0 ? frame.y + ptToPx(frame.frameHeight) : Infinity;
  const found = [];
  for (const a of annotations) {
    if (a.id === frame.id || !wrapsText(a)) continue;
    const offset = ptToPx(a.wrapOffset != null ? a.wrapOffset : 6);
    for (const poly of wrapPolygons(a, a.type === "image" && a.textWrap === "shape" ? rowsFor(a) : null)) {
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      if (Math.max(...xs) + offset <= left || Math.min(...xs) - offset >= right) continue;
      if (Math.max(...ys) + offset <= top || Math.min(...ys) - offset >= bottom) continue;
      found.push({ pts: poly.map(([x, y]) => [x - frame.x, y - frame.y]), offset });
    }
  }
  return found.length ? found : null;
}

// How far a polygon reaches left and right within the band y0..y1 (null if it doesn't reach the band).
function bandExtent(pts, y0, y1) {
  let lo = Infinity, hi = -Infinity;
  const take = (x) => { if (x < lo) lo = x; if (x > hi) hi = x; };
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    if (ay >= y0 && ay <= y1) take(ax);
    // Where the edge crosses the band's top and bottom.
    for (const yl of [y0, y1]) {
      if ((ay - yl) * (by - yl) < 0) take(ax + (bx - ax) * (yl - ay) / (by - ay));
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

// The widest free stretch of [left, right] on the band y0..y1, given obstacles in the same
// coordinates (`scale` turns their editor px into the caller's units). Returns { x, width }
// with x measured from `left`, or null when no stretch is at least `minWidth` wide.
export function freeSlot(obstacles, left, right, y0, y1, minWidth, scale = 1) {
  const blocked = [];
  for (const ob of obstacles) {
    const off = ob.offset * scale;
    const ext = bandExtent(ob.pts.map(([x, y]) => [x * scale, y * scale]), y0 - off, y1 + off);
    if (ext) blocked.push([ext[0] - off, ext[1] + off]);
  }
  if (!blocked.length) return { x: 0, width: right - left };
  blocked.sort((a, b) => a[0] - b[0]);
  let best = null;
  let at = left;
  const consider = (from, to) => {
    const w = Math.min(to, right) - Math.max(from, left);
    if (w >= minWidth && (!best || w > best.width + 1e-6)) best = { x: Math.max(from, left) - left, width: w };
  };
  for (const [b0, b1] of blocked) {
    if (b0 > at) consider(at, b0);
    at = Math.max(at, b1);
  }
  consider(at, right);
  return best;
}

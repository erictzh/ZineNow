// Pen and highlighter: defaults, swatches, smoothed and tapered outlines, hit-testing.

export const PEN_COLOR_SWATCHES = ["#1a1a1a", "#dd531a", "#dc2626", "#2563eb"];
export const HIGHLIGHTER_COLOR_SWATCHES = ["#ffe066", "#ffb84d", "#7ec8ff", "#ff9ecf", "#7dffb3"];

export const PEN_DEFAULTS = { color: "#1a1a1a", width: 2.5 };
export const HIGHLIGHTER_DEFAULTS = { color: "#ffe066", width: 14 };

// Turns raw recorded points into a smoothed SVG path — quadratic curves
// through the midpoint of each consecutive pair, using the shared point
// as the control. A common, cheap freehand-smoothing trick: it rounds
// off the jagged look of raw mouse samples without needing pressure
// data (which a mouse doesn't have) or an external library. Hit-testing
// for the eraser still uses the original raw points, not this curve.
export function smoothPathD(points) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;
  }
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    d += ` Q ${x0},${y0} ${mx},${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]},${last[1]}`;
  return d;
}

// Shortest distance from point p to the segment a-b — used by the
// eraser to decide whether it's passing close enough to a stroke.
function distToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

export function strokeHitTest(point, ann) {
  const threshold = (ann.strokeWidth || 8) / 2 + 6;
  for (let i = 0; i < ann.points.length - 1; i++) {
    if (distToSegment(point, ann.points[i], ann.points[i + 1]) <= threshold) return true;
  }
  return false;
}

// ---- Variable-width (tapered) stroke outline --------------------------
// A plain SVG <path stroke-width> can't vary along its length, so a
// real taper means building a filled silhouette instead: offset each
// point perpendicular to the stroke's direction by half the width AT
// THAT POINT, narrowing near both ends when taper > 0. `taper` is a
// fraction (0–0.45) of the stroke's total length that each end spends
// ramping in/out; 0 means constant width (no taper) the whole way.
export function taperedPathD(points, baseWidth, taper) {
  if (points.length < 2) return "";
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = dists[dists.length - 1] || 1;
  const tf = Math.min(0.45, Math.max(0, taper));

  function widthAt(t) {
    if (tf <= 0) return baseWidth;
    let factor;
    if (t < tf) factor = t / tf;
    else if (t > 1 - tf) factor = (1 - t) / tf;
    else factor = 1;
    return Math.max(baseWidth * 0.12, baseWidth * factor);
  }

  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const t = dists[i] / total;
    const w = widthAt(t) / 2;
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next[0] - prev[0], dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const nx = -dy, ny = dx;
    left.push([points[i][0] + nx * w, points[i][1] + ny * w]);
    right.push([points[i][0] - nx * w, points[i][1] - ny * w]);
  }

  let d = `M ${left[0][0]},${left[0][1]}`;
  for (let i = 1; i < left.length; i++) d += ` L ${left[i][0]},${left[i][1]}`;
  for (let i = right.length - 1; i >= 0; i--) d += ` L ${right[i][0]},${right[i][1]}`;
  d += " Z";
  return d;
}

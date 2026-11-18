// Rulers and ruler guides (the draggable lines pulled out of the rulers, as in Photoshop): units,
// where the ruler ticks fall, and snapping a moved box to the guides. Pure.
//
// A guide is { id, axis, pos }: axis "x" is a vertical line at x = pos, axis "y" a horizontal
// line at y = pos. `pos` is in points from the page's top-left corner, so guides keep their place
// whatever the zoom. They're document-wide (every page shows the same guides).

export const RULER_UNITS = [
  { key: "mm", label: "Millimetres (mm)", perPt: 25.4 / 72 },
  { key: "cm", label: "Centimetres (cm)", perPt: 2.54 / 72 },
  { key: "in", label: "Inches (in)", perPt: 1 / 72 },
  { key: "pt", label: "Points (pt)", perPt: 1 },
];
export const DEFAULT_RULER_UNIT = "mm";
export const unitInfo = (key) => RULER_UNITS.find((u) => u.key === key) || RULER_UNITS[0];

// Points <-> the ruler's unit.
export const ptToUnit = (pt, unit) => pt * unitInfo(unit).perPt;
export const unitToPt = (value, unit) => value / unitInfo(unit).perPt;

// A position for the readout: "42.5 mm".
export function formatInUnit(pt, unit) {
  const v = ptToUnit(pt, unit);
  const digits = unit === "pt" || unit === "mm" ? 1 : 2;
  return `${Number(v.toFixed(digits))} ${unit}`;
}

// The gap between the two guides (of `axis`) on either side of `pos` (points), for the readout when
// hovering a ruler: { from, to, length } in points, or null when `pos` isn't between two guides.
export function guideGap(guides, axis, pos) {
  let from = null, to = null;
  for (const g of guides) {
    if (g.axis !== axis) continue;
    if (g.pos <= pos && (from == null || g.pos > from)) from = g.pos;
    if (g.pos > pos && (to == null || g.pos < to)) to = g.pos;
  }
  return from == null || to == null ? null : { from, to, length: to - from };
}

// The Measure tool: how far apart two points are. Any one unit in, the same unit out
// ({ dx, dy, length }); `angle` is in degrees counter-clockwise from the right (0..360), as on paper.
export function measureBetween(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const deg = Math.round(((Math.atan2(-dy, dx) * 180) / Math.PI) * 10) / 10; // -180..180, to a tenth
  return { dx, dy, length: Math.hypot(dx, dy), angle: (deg + 360) % 360 };
}

// Shift while measuring: `to` moved onto the nearest 45° line from `from`, keeping its distance.
export function constrainTo45(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const step = Math.PI / 4, len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
}

// Snaps a position in points to the nearest whole step of the unit (Shift while dragging a guide):
// 1 mm, 0.1 cm, 1/8 in, 1 pt.
export function snapToUnit(pt, unit) {
  const step = unit === "in" ? 1 / 8 : unit === "cm" ? 0.1 : 1;
  return unitToPt(Math.round(ptToUnit(pt, unit) / step) * step, unit);
}

// How much of the pointer's movement a dragged guide follows, by the pointer's speed (px per ms):
// 1 (exactly with the pointer) at a normal pace, down to 0.1 when crawling, for fine steps.
export function dragGain(speedPxPerMs) {
  const FAST = 0.5, SLOW_GAIN = 0.1;
  return Math.max(SLOW_GAIN, Math.min(1, speedPxPerMs / FAST));
}

// The ruler's ticks between `fromPt` and `toPt` (points along the page), at `pxPerPt` screen px
// per point. Numbered ticks are spaced at least `minLabelPx` apart; each numbered step is split
// into smaller ticks while they stay at least 4 px apart. Returns [{ pt, value, size }] where size
// is "major" (numbered), "mid" or "minor".
export function rulerTicks(fromPt, toPt, pxPerPt, unit, minLabelPx = 48) {
  const perPt = unitInfo(unit).perPt;
  const pxPerUnit = pxPerPt / perPt;
  const steps = [];
  for (let e = -3; e <= 5; e++) for (const m of [1, 2, 5]) steps.push(m * 10 ** e);
  const major = steps.find((s) => s * pxPerUnit >= minLabelPx) || steps[steps.length - 1];
  // Subdivisions: halves, then fifths/tenths of the numbered step where there's room.
  const firstDigit = Math.round(major / 10 ** Math.floor(Math.log10(major) + 1e-9));
  const splits = (firstDigit === 2 ? [2, 4, 8] : firstDigit === 5 ? [5, 10] : [2, 10]).filter((n) => (major / n) * pxPerUnit >= 4);
  const minorCount = splits.length ? splits[splits.length - 1] : 1;
  const minor = major / minorCount;
  const ticks = [];
  const start = Math.floor(fromPt * perPt / minor), end = Math.ceil(toPt * perPt / minor);
  if (end - start > 5000) return ticks; // never draw an absurd number of ticks
  for (let k = start; k <= end; k++) {
    const value = k * minor;
    const onMajor = Math.abs(value / major - Math.round(value / major)) < 1e-6;
    const onMid = !onMajor && minorCount % 2 === 0 && Math.abs((value / major) * 2 - Math.round((value / major) * 2)) < 1e-6;
    ticks.push({ pt: value / perPt, value: Number(value.toFixed(6)), size: onMajor ? "major" : onMid ? "mid" : "minor" });
  }
  return ticks;
}

// How far to nudge a moved box so one of its edges or its middle lands on a guide:
// `box` is { x0, y0, x1, y1 } where the box would be (page px), `guides` hold positions in page px
// on each axis ({ x: [...], y: [...] }), `threshold` is how close counts (page px).
// Returns { dx, dy } to add (0 where nothing is close).
export function snapToGuides(box, guides, threshold) {
  const nearest = (edges, lines) => {
    let best = 0, bestDist = threshold;
    for (const edge of edges) for (const line of lines) {
      const d = Math.abs(line - edge);
      if (d <= bestDist) { bestDist = d; best = line - edge; }
    }
    return best;
  };
  return {
    dx: nearest([box.x0, (box.x0 + box.x1) / 2, box.x1], guides.x || []),
    dy: nearest([box.y0, (box.y0 + box.y1) / 2, box.y1], guides.y || []),
  };
}

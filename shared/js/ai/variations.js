// "Try another" for the AI fill (ZEditor's Marquee, Ai Tools (Local)): the model gives the same answer for the same input, so each press
// shows it a slightly different view. A fixed cycle (press N always gives variation N): the window is moved by a fraction of its size,
// made a bit bigger or smaller, and the area is grown by a few px (never shrunk, which could leave a ring of the old object).
// Variation 0 = the normal fill. Pure maths, no browser parts.

export const AI_VARIATIONS = [
  { dx: 0, dy: 0, scale: 1, grow: 0 },
  { dx: -0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0, dy: -0.12, scale: 1, grow: 1 },
  { dx: 0, dy: 0.12, scale: 1, grow: 2 },
  { dx: 0, dy: 0, scale: 1.25, grow: 0 },
  { dx: 0.08, dy: 0.08, scale: 0.85, grow: 3 },
];
export function variationFor(n) { return AI_VARIATIONS[((Math.round(n) || 0) % AI_VARIATIONS.length + AI_VARIATIONS.length) % AI_VARIATIONS.length]; }

// Moves / resizes a window (kept inside the picture, and still covering the whole area `bounds`).
export function varyCrop(crop, v, bounds, w, h) {
  let side = Math.min(Math.min(w, h), Math.max(1, Math.round(crop.side * v.scale)));
  const need = Math.max(bounds.x1 - bounds.x0 + 1, bounds.y1 - bounds.y0 + 1);
  if (side < need) side = Math.min(Math.min(w, h), crop.side);
  const cx = crop.x + crop.side / 2 + v.dx * crop.side, cy = crop.y + crop.side / 2 + v.dy * crop.side;
  let x = Math.round(cx - side / 2), y = Math.round(cy - side / 2);
  x = Math.min(Math.max(0, x), w - side); y = Math.min(Math.max(0, y), h - side);
  // the area must stay inside the window
  x = Math.min(Math.max(x, bounds.x1 + 1 - side), bounds.x0); y = Math.min(Math.max(y, bounds.y1 + 1 - side), bounds.y0);
  x = Math.min(Math.max(0, x), w - side); y = Math.min(Math.max(0, y), h - side);
  if (x > bounds.x0 || y > bounds.y0 || x + side < bounds.x1 + 1 || y + side < bounds.y1 + 1) return crop;
  return { x, y, side };
}

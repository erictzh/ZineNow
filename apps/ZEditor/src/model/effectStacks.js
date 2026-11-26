// Stacked strokes and shadows for pictures and shapes: any number of each, like Photoshop's layer styles. Pure.
//
// New items keep them in `strokes` and `shadows` (arrays, the FIRST entry is on top). Items made before stacking have one stroke or one
// shadow in the old separate props (`stroke`, `strokeColor`, `strokeThickness`; `shadow`, `shadowColor`, `shadowThickness`,
// `shadowDirection`, `shadowBlur`): strokeLayers() and shadowLayers() read either, so old projects look exactly as before. `stroke` and
// `shadow` are the on/off switches: true while there is at least one layer, false (whatever the list holds) when the effect is off.

export const STROKE_MITER_LIMIT = 4; // set explicitly so the live SVG and the export canvas agree

export const STROKE_POSITIONS = [
  { key: "inside", label: "Inside" },
  { key: "center", label: "Center" },
  { key: "outside", label: "Outside" },
];
// fill: "solid" (just `color`) or "gradient" (a line from `color` to `color2` at `angle`, like a shape's linear gradient: 0° up, 90° to the right).
export const DEFAULT_STROKE = { color: "#000000", thickness: 4, position: "center", fill: "solid", color2: "#ffd400", angle: 90 };
export const DEFAULT_SHADOW = { color: "#000000", thickness: 6, direction: 135, blur: 0 };
export const MAX_LAYERS = 8;

const num = (v, lo, hi, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.min(hi, Math.max(lo, Number(v))) : fallback);
const hexOr = (v, fallback) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);

const cleanStroke = (s) => ({
  color: hexOr(s && s.color, DEFAULT_STROKE.color),
  thickness: num(s && s.thickness, 0.5, 40, DEFAULT_STROKE.thickness),
  position: STROKE_POSITIONS.some((p) => p.key === (s && s.position)) ? s.position : DEFAULT_STROKE.position,
  fill: s && s.fill === "gradient" ? "gradient" : "solid",
  color2: hexOr(s && s.color2, DEFAULT_STROKE.color2),
  angle: num(s && s.angle, 0, 360, DEFAULT_STROKE.angle),
});
const cleanShadow = (s) => ({
  color: hexOr(s && s.color, DEFAULT_SHADOW.color),
  thickness: num(s && s.thickness, 0, 60, DEFAULT_SHADOW.thickness),
  direction: num(s && s.direction, 0, 360, DEFAULT_SHADOW.direction),
  blur: num(s && s.blur, 0, 40, DEFAULT_SHADOW.blur),
});

// An old single stroke as a layer. A picture's old stroke was centred on the edge. A text's old stroke was drawn centred but UNDER the letters, so only
// its outer half showed: that is an outside stroke half as thick, which looks exactly the same.
function legacyStroke(ann) {
  const t = Number.isFinite(Number(ann.strokeThickness)) && ann.strokeThickness != null ? Number(ann.strokeThickness) : DEFAULT_STROKE.thickness;
  return ann.type === "text"
    ? { color: hexOr(ann.strokeColor, DEFAULT_STROKE.color), thickness: Math.min(40, Math.max(0.5, t / 2)), position: "outside" }
    : cleanStroke({ color: ann.strokeColor, thickness: ann.strokeThickness, position: "center" });
}

// The item's strokes, top first: [{ color, thickness (px), position: "inside" | "center" | "outside" }].
export function strokeLayers(ann) {
  if (!ann.stroke) return []; // the flag is the on/off switch (the effect's checkbox; it is false when the list is empty)
  if (Array.isArray(ann.strokes)) return ann.strokes.slice(0, MAX_LAYERS).map(cleanStroke);
  return [legacyStroke(ann)];
}

// The item's shadows, top first: [{ color, thickness (distance, px), direction (°), blur (px) }].
export function shadowLayers(ann) {
  if (!ann.shadow) return [];
  if (Array.isArray(ann.shadows)) return ann.shadows.slice(0, MAX_LAYERS).map(cleanShadow);
  return [cleanShadow({ color: ann.shadowColor, thickness: ann.shadowThickness, direction: ann.shadowDirection, blur: ann.shadowBlur })];
}

// The changes that store `layers` as the item's strokes: the list, the on/off flag, and the old single-stroke props cleared (a stroke on a
// faded edge looks wrong, so Feather goes off with the first stroke).
export function strokesPatch(layers) {
  return { strokes: layers.map(cleanStroke), stroke: layers.length > 0, strokeColor: undefined, strokeThickness: undefined, ...(layers.length ? { feather: false } : {}) };
}
export function shadowsPatch(layers) {
  return { shadows: layers.map(cleanShadow), shadow: layers.length > 0, shadowColor: undefined, shadowThickness: undefined, shadowDirection: undefined, shadowBlur: undefined };
}

// How far past the outline the strokes reach, in px (the corner spikes of a miter join included): the room a picture or shape needs round it.
export function strokeReach(layers) {
  let reach = 0;
  for (const s of layers) {
    const r = s.position === "inside" ? 0 : s.position === "outside" ? s.thickness * STROKE_MITER_LIMIT : (s.thickness * STROKE_MITER_LIMIT) / 2;
    reach = Math.max(reach, r);
  }
  return reach;
}

// How far the shadows reach past the outline, in px.
export function shadowReach(layers) {
  let reach = 0;
  for (const s of layers) reach = Math.max(reach, s.thickness + s.blur * 2);
  return reach;
}

// A shadow as the offset the drawing code uses: { x, y, blur, color }. Direction 0° is up, 90° right.
export function shadowOffsetOf(s) {
  const radians = (s.direction * Math.PI) / 180;
  return { x: Math.sin(radians) * s.thickness, y: -Math.cos(radians) * s.thickness, blur: s.blur, color: s.color };
}

// The layers an item holds even while the effect is switched off (so turning it back on brings them back): the list, or the old single one.
export function storedStrokes(ann) {
  if (Array.isArray(ann.strokes)) return ann.strokes.slice(0, MAX_LAYERS).map(cleanStroke);
  return ann.stroke ? strokeLayers(ann) : [];
}
export function storedShadows(ann) {
  if (Array.isArray(ann.shadows)) return ann.shadows.slice(0, MAX_LAYERS).map(cleanShadow);
  return ann.shadow ? shadowLayers(ann) : [];
}

// A stroke's paint as colour stops (0% to 100%), for the canvas and for SVG gradients.
export const strokeIsGradient = (s) => s.fill === "gradient";
export const strokeStops = (s) => [{ percent: 0, color: s.color }, { percent: 100, color: s.color2 }];

// The two ends of a linear gradient over a box (x, y, w, h) at `angle` degrees (0 up, 90 right): through the middle, long enough that the corners
// land exactly on its ends, as CSS draws linear-gradient(). Returns { x1, y1, x2, y2 }.
export function gradientLine(angle, x, y, w, h) {
  const rad = (angle * Math.PI) / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = x + w / 2, cy = y + h / 2;
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}

// Image Trace settings: the presets, the controls the Format panel shows, and how a slider maps onto the tracer.

// A trace layer keeps its settings in `ann.trace`:
//   mode:        "bw" (black & white by a threshold), "gray" (shades of grey) or "color"
//   threshold:   0–255, bw only: darker than this is black
//   colors:      2–16, gray/color: how many colours the picture is reduced to
//   detail:      0–100: how closely the outlines follow the pixels (higher = more points, less smoothing)
//   corners:     0–100: how readily a bend becomes a sharp corner instead of a curve
//   noise:       0–100: specks smaller than this many trace pixels are dropped
//   ignoreWhite: "keep" | "drop": near-white areas become see-through instead of white shapes
//   method:      "overlap" (each colour's shape also runs under the colours above it, so no hairline
//                gaps show between them) or "abut" (each shape is exactly its own colour's area)
//   fills, strokes: "on" | "off": fill the shapes, and/or draw their outlines
//   strokeWidth: 1–20 trace px, the outlines' width when strokes are on
//   view:        what the editor shows (Export always draws the result): "result", "outlines" (thin
//                outlines only), "outlinesSource" (outlines over the traced picture) or "source"
export const TRACE_PRESETS = [
  { key: "bw", label: "Black & White", settings: { mode: "bw", threshold: 128, detail: 50, corners: 50, noise: 8, ignoreWhite: "drop" } },
  { key: "lineart", label: "Line Art", settings: { mode: "bw", threshold: 160, detail: 75, corners: 40, noise: 4, ignoreWhite: "drop" } },
  { key: "silhouette", label: "Silhouette", settings: { mode: "bw", threshold: 235, detail: 30, corners: 50, noise: 25, ignoreWhite: "drop" } },
  { key: "outline", label: "Outline", settings: { mode: "bw", threshold: 128, detail: 60, corners: 50, noise: 8, ignoreWhite: "drop", fills: "off", strokes: "on", strokeWidth: 2 } },
  { key: "gray", label: "Shades of Grey", settings: { mode: "gray", colors: 4, detail: 50, corners: 50, noise: 10, ignoreWhite: "keep" } },
  { key: "color3", label: "3 Colours", settings: { mode: "color", colors: 3, detail: 45, corners: 50, noise: 16, ignoreWhite: "keep" } },
  { key: "color6", label: "6 Colours", settings: { mode: "color", colors: 6, detail: 55, corners: 50, noise: 12, ignoreWhite: "keep" } },
  { key: "color16", label: "16 Colours", settings: { mode: "color", colors: 16, detail: 65, corners: 50, noise: 8, ignoreWhite: "keep" } },
];

export const DEFAULT_TRACE_PRESET = "bw";

// Shared by every preset: what a trace creates and how the editor shows it.
const COMMON = { method: "overlap", fills: "on", strokes: "off", strokeWidth: 2, view: "result" };

// The longest side, in pixels, of the picture that gets traced. More is finer but slower.
export const TRACE_MAX_SIDE = 900;

const isBw = (v) => v.mode === "bw";
export const TRACE_VIEW_OPTIONS = [
  { key: "result", label: "Tracing result" },
  { key: "outlines", label: "Outlines" },
  { key: "outlinesSource", label: "Outlines with source image" },
  { key: "source", label: "Source image" },
];
// The panel's main block (under Preset and View) and its Advanced block.
export const TRACE_MAIN_CONTROLS = [
  {
    kind: "select", prop: "mode", label: "Mode", fallback: "bw",
    options: [{ key: "bw", label: "Black & white" }, { key: "gray", label: "Shades of grey" }, { key: "color", label: "Colour" }],
  },
  { kind: "slider", prop: "threshold", label: "Threshold", min: 0, max: 255, fallback: 128, showIf: isBw },
  { kind: "slider", prop: "colors", label: "Colours", min: 2, max: 16, fallback: 6, showIf: (v) => !isBw(v) },
];
export const TRACE_ADVANCED_CONTROLS = [
  { kind: "slider", prop: "detail", label: "Paths (%)", min: 0, max: 100, fallback: 50 },
  { kind: "slider", prop: "corners", label: "Corners (%)", min: 0, max: 100, fallback: 50 },
  { kind: "slider", prop: "noise", label: "Noise (px)", min: 0, max: 100, fallback: 8 },
  {
    kind: "select", prop: "ignoreWhite", label: "White areas", fallback: "keep",
    options: [{ key: "keep", label: "Keep as shapes" }, { key: "drop", label: "Leave see-through" }],
  },
];
// Settings that only change how the result is drawn: changing them needs no new trace.
export const TRACE_DRAW_PROPS = ["fills", "strokes", "strokeWidth", "view"];

export function presetSettings(key) {
  const preset = TRACE_PRESETS.find((p) => p.key === key) || TRACE_PRESETS[0];
  return { preset: preset.key, colors: 6, threshold: 128, ...COMMON, ...preset.settings };
}

// The settings that change what the tracer makes (the rest only change how it is drawn or shown).
export const TRACE_SHAPE_PROPS = ["mode", "threshold", "colors", "detail", "corners", "noise", "ignoreWhite", "method"];
export const TRACE_ADVANCED_PROPS = ["detail", "corners", "noise", "ignoreWhite", "method"];

// `preset` is the preset last picked; the panel says "Custom" once the values differ from it.
// (Threshold only counts in black & white, colours only in the other modes.)
export function matchesPreset(settings) {
  const s = normalizeTraceSettings(settings);
  const p = presetSettings(s.preset);
  return TRACE_SHAPE_PROPS.every((k) => (k === "threshold" && s.mode !== "bw") || (k === "colors" && s.mode === "bw") || s[k] === p[k]);
}

// Every setting filled in and kept in range.
export function normalizeTraceSettings(s = {}) {
  const base = presetSettings(s.preset || DEFAULT_TRACE_PRESET);
  const v = { ...base, ...s };
  const clamp = (x, lo, hi, fb) => (Number.isFinite(Number(x)) ? Math.min(hi, Math.max(lo, Math.round(Number(x)))) : fb);
  return {
    preset: v.preset,
    mode: ["bw", "gray", "color"].includes(v.mode) ? v.mode : "bw",
    threshold: clamp(v.threshold, 0, 255, 128),
    colors: clamp(v.colors, 2, 16, 6),
    detail: clamp(v.detail, 0, 100, 50),
    corners: clamp(v.corners, 0, 100, 50),
    noise: clamp(v.noise, 0, 100, 8),
    ignoreWhite: v.ignoreWhite === "drop" ? "drop" : "keep",
    method: v.method === "abut" ? "abut" : "overlap",
    fills: v.fills === "off" ? "off" : "on",
    strokes: v.strokes === "on" ? "on" : "off",
    strokeWidth: clamp(v.strokeWidth, 1, 20, 2),
    view: TRACE_VIEW_OPTIONS.some((o) => o.key === v.view) ? v.view : "result",
  };
}

// Slider values → the numbers the tracer works with.
//   tolerance: how far (trace px) a simplified outline may stray from the pixel edge
//   cornerAngle: a bend sharper than this (degrees) is drawn as a corner
//   minArea: outlines enclosing less than this (trace px²) are dropped
export function tracerParams(settings) {
  const s = normalizeTraceSettings(settings);
  return {
    tolerance: 2.2 - (s.detail / 100) * 1.8,
    cornerAngle: 150 - (s.corners / 100) * 120,
    minArea: s.noise,
  };
}

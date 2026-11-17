// Page and image filter types, their settings lists and defaults, and which filter an image ends up with.

// Page filter — a photocopier/screen-print treatment applied to both
// the page background and any placed images. Pen and text annotations
// are never touched, so your own marks stay crisp on top. Applies both
// live and in Export PDF. Global across the whole document, same scope
// as Guides, rather than per-page — real zines usually want one
// consistent treatment throughout.
export const PAGE_FILTER_OPTIONS = [
  { key: "none", label: "None" },
  { key: "grayscale", label: "Grayscale" },
  { key: "duotone", label: "Duotone" },
  { key: "halftone", label: "Halftone" },
  { key: "threshold", label: "Threshold" },
];
// Same treatments, plus "Match Page" — an image's own filter
// defaults to following whatever the page filter is, same as before
// this existed, rather than starting every image at "None".
export const IMAGE_FILTER_OPTIONS = [
  { key: "match", label: "Match Page" },
  ...PAGE_FILTER_OPTIONS,
  { key: "xerox", label: "Xerox" }, // per-image only
];
const INK_COLOR_CONTROL = { kind: "color", prop: "inkColor", label: "Ink color", fallback: "#000000" };
const PAPER_COLOR_CONTROL = { kind: "color", prop: "paperColor", label: "Paper color", fallback: "#ffffff" };
export const THRESHOLD_FILTER_CONTROLS = [
  { kind: "slider", prop: "level", label: "Cutoff", min: 0, max: 255, fallback: 128 },
  INK_COLOR_CONTROL,
  PAPER_COLOR_CONTROL,
];
export const XEROX_FILTER_CONTROLS = [
  { kind: "slider", prop: "contrast", label: "Contrast", min: 0, max: 100, fallback: 75 },
  { kind: "slider", prop: "exposure", label: "Exposure", min: 0, max: 100, fallback: 50 },
  { kind: "slider", prop: "speckle", label: "Toner speckle", min: 0, max: 100, fallback: 35 },
  { kind: "slider", prop: "streaks", label: "Streaks", min: 0, max: 100, fallback: 25 },
  { kind: "slider", prop: "edgeWear", label: "Edge wear", min: 0, max: 100, fallback: 30 },
  { kind: "slider", prop: "xeroxVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  INK_COLOR_CONTROL,
  PAPER_COLOR_CONTROL,
];
export const DEFAULT_DUOTONE_DARK = "#1a1a1a";
export const DEFAULT_DUOTONE_LIGHT = "#ffe066";
export const MIN_HALFTONE_CELL_SIZE = 1;
export const HALFTONE_FILTER_CONTROLS = [
  {
    kind: "select", prop: "colorMode", label: "Color", fallback: "mono",
    options: [{ key: "mono", label: "Monochrome" }, { key: "cmyk", label: "Full color (CMYK)" }],
  },
  {
    kind: "select", prop: "screen", label: "Screen", fallback: "dotsLines",
    options: [{ key: "dotsLines", label: "Dots / Lines" }, { key: "dither", label: "1-Bit Dither" }],
  },
  { kind: "slider", prop: "lineBlend", label: "Dots ↔ Lines (%)", min: 0, max: 100, fallback: 0, showIf: (v) => v.screen !== "dither" },
  { kind: "slider", prop: "cellSize", label: "Size (px)", min: MIN_HALFTONE_CELL_SIZE, max: 16, fallback: 6 },
  { kind: "slider", prop: "angle", label: "Angle (°)", min: 0, max: 180, fallback: 0 },
  { kind: "color", prop: "color", label: "Ink color", fallback: "#1a1a1a", showIf: (v) => v.colorMode !== "cmyk" },
];
// Filters whose settings are built from a control list (keyed by filter
// type). These all replace pixels, so images preview them on a canvas.
export const FILTER_CONTROLS = {
  threshold: THRESHOLD_FILTER_CONTROLS,
  halftone: HALFTONE_FILTER_CONTROLS,
  xerox: XEROX_FILTER_CONTROLS,
};
export const DEFAULT_PAGE_FILTER = { type: "none" };

// Resolves what an image annotation should actually be filtered with:
// no `ann.filter` (or type "match") follows the page filter, exactly
// like every image behaved before per-image filters existed; type
// "none" opts an image out even when the page has a filter; anything
// else is the image's own independent filter settings.
export function effectiveImageFilter(ann, pageFilter) {
  const f = ann.filter;
  if (!f || f.type === "match") return pageFilter || { type: "none" };
  if (f.type === "none") return { type: "none" };
  return f;
}

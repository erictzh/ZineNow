// Editor-wide numbers: render scales, page size fallback, paper presets, zoom limits, export DPI.

export const THUMB_SCALE = 0.3;
export const MAIN_SCALE = 1.1;
export const DEFAULT_PAGE_SIZE = { width: 420, height: 594 }; // used only if no PDF has been loaded yet
// Paper sizes for starting a new blank document, in PDF points (1/72 in),
// portrait. Landscape just swaps width and height.
export const NEW_DOCUMENT_PRESETS = [
  { key: "a3", label: "A3", width: 841.89, height: 1190.55 },
  { key: "a4", label: "A4", width: 595.28, height: 841.89 },
  { key: "a5", label: "A5", width: 419.53, height: 595.28 },
  { key: "a6", label: "A6", width: 297.64, height: 419.53 },
  { key: "letter", label: "US Letter", width: 612, height: 792 },
  { key: "half-letter", label: "Half Letter", width: 396, height: 612 },
  { key: "digest", label: "Digest", width: 396, height: 594 },
];
export const MAX_NEW_DOCUMENT_PAGES = 100;
export const ZOOM_PERCENT = { min: 25, max: 400, initial: 100 };

// Guides — trim/margin/bleed presets, in inches. Page geometry
// (page.width/height, canvas px at MAIN_SCALE) is already in points
// (72/in), same unit pdf.js and PDFs use, so presets convert cleanly.
export const POINTS_PER_INCH = 72;

// ==========================================================================
// Export — renders each page (background + all annotations) to a canvas
// at export resolution, exactly reusing the same stroke geometry
// (smoothPathD/taperedPathD) the live editor draws with via Path2D, so
// the exported PDF always matches what's on screen. Text is redrawn
// with manual word-wrapping since canvas has no built-in text-wrap.
// ==========================================================================
const EXPORT_DPI = 200;
export const EXPORT_SCALE = EXPORT_DPI / 72; // PDF/pdf.js "scale 1" is 72 DPI

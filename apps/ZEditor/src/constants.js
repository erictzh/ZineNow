// Editor-wide numbers: render scales, page size fallback, paper presets, zoom limits, export DPI.

// Sidebar thumbnails are drawn at THUMB_SCALE (pixels per PDF point) but shown at THUMB_SHOWN_SCALE
// (CSS pixels per point): 1.5x the pixels, so they stay sharp on a high-density screen. The <img> says so
// through `srcset` (ui/sidebar/Thumbnail.jsx), which keeps the on-screen size as it was.
export const THUMB_SCALE = 0.45;
export const THUMB_SHOWN_SCALE = 0.3;
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
  // Name cards (portrait here like the rest; choosing one switches the dialog to landscape, the way cards are usually made).
  { key: "name-card-90x55", label: "Name card 90 × 55 mm", width: 155.91, height: 255.12, preferLandscape: true, noSize: true },
  { key: "name-card-90x54", label: "Name card 90 × 54 mm", width: 153.07, height: 255.12, preferLandscape: true, noSize: true },
  { key: "name-card-bank", label: "Name card 85.6 × 54 mm (bank-card size)", width: 153.07, height: 242.65, preferLandscape: true, noSize: true },
  { key: "name-card-us", label: "Business card 3.5 × 2 in (US)", width: 144, height: 252, preferLandscape: true, noSize: true },
];
export const MAX_NEW_DOCUMENT_PAGES = 100;
// A "no paper" page (an auto-expanding canvas): where it starts, in pt, and how it grows (editor px, see state/useCanvasGrow.js).
export const CANVAS_PAGE_START = { width: 800, height: 600 };
export const CANVAS_GROW_TRIGGER_PX = 40; // content this close to the edge (or past it) makes the canvas grow...
export const CANVAS_GROW_MARGIN_PX = 240; // ...until there is this much room beyond the content
export const ZOOM_PERCENT = { min: 10, max: 600, initial: 100 };

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

// Soft-eraser brush defaults.

// Renders one full page (background + annotations) to an offscreen
// canvas at export resolution. Kept independent from ComposeCanvas's
// own live-editing render path (some duplicated logic, but it avoids
// any risk of an export-specific change accidentally affecting the
// already-tested live editor).
// ---- Soft eraser: fades an image's own pixels to transparent with a
// feathered round brush, like a soft eraser in a paint program.
export const SOFT_ERASER_DEFAULTS = { size: 40, softness: 60, strength: 100 };
export const SOFT_ERASER_DABS_PER_RADIUS = 4; // dabs overlap ~4 deep along a stroke

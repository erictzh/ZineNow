// Magic eraser settings: what counts as "the same colour" as the one clicked, which matching pixels go, and how the edge is finished.

// clickMode:      what a click on an image does. "match" = erase the clicked
//                 colour (the settings below). "refine" = no colour match:
//                 clean up the existing boundary between the image's
//                 transparent and coloured pixels, using only the edge
//                 settings (shift, feather, specks, defringe).
// Every click opens a live preview; the settings can be changed until it's
// applied (see state/useMagicErase.js).
//
// ── What matches ──────────────────────────────────────────────────────────
// Brightness and colour are measured separately, so shadows on a surface can
// match while a differently-coloured subject doesn't.
// tolerance:      brightness difference allowed, 0–255 (0 = same brightness
//                 only, 255 = any brightness).
// colorTolerance: colour (hue/saturation) difference allowed, 0–255 (0 = same
//                 colour only, 255 = any colour). Both at 255 erases every
//                 visible pixel.
// smoothing:      radius in image px that each pixel's colour is averaged over
//                 before comparing, 0–MAGIC_SMOOTHING_MAX (0 = raw pixels; more
//                 ignores grain/noise, but blurs thin details and fine edges).
// ── Which matches go ──────────────────────────────────────────────────────
// contiguous:     true = only pixels connected to the clicked one (like
//                 Photoshop's "Contiguous"); false = every matching pixel.
// diagonal:       with contiguous, also count pixels touching only at a corner
//                 as connected (a fill can then leak through 1px diagonal gaps).
// ── How the edge is finished ──────────────────────────────────────────────
// softness and opacity belong to "Erase a colour". feather, edgeShift, specks and
// defringe belong to "Refine edge" only: an erase click ignores them (see
// state/useMagicErase.js), so you erase first and refine as a second step.
// softness:       0–100. Pixels just past the tolerance are erased partly, not
//                 all-or-nothing: this is the width of that fade zone as a
//                 percentage of the tolerance (0 = hard cut-off).
// feather:        0–MAGIC_FEATHER_MAX px. Blurs the cut edge; the fade reaches
//                 about this many px each side.
// edgeShift:      ±MAGIC_SHIFT_MAX px. Moves the cut edge: positive grows the
//                 erased area (removes fringe), negative shrinks it (keeps
//                 more of the subject).
// specks:         0–MAGIC_SPECKS_MAX px. Islands up to this many pixels big
//                 are flipped: leftover specks inside the erased area get
//                 erased, and (whole-image mode) tiny matches elsewhere are
//                 kept. 0 = off.
// defringe:       0–100%. Pulls the colour of half-erased edge pixels toward
//                 the nearby kept colour, removing the old-background halo.
// opacity:        1–100%. How fully matches are erased (100 = completely).
export const MAGIC_ERASER_DEFAULTS = {
  clickMode: "match", tolerance: 32, colorTolerance: 13, smoothing: 2,
  contiguous: true, diagonal: false,
  softness: 20, feather: 1, edgeShift: 0, specks: 0, defringe: 50, opacity: 100,
};
export const MAGIC_TOLERANCE_MAX = 255;
export const MAGIC_SMOOTHING_MAX = 6;
export const MAGIC_FEATHER_MAX = 12;
export const MAGIC_SHIFT_MAX = 8;
export const MAGIC_SPECKS_MAX = 500;

// Photo-adjustment slider definitions and whether an image has any adjustment.

// ---- Photo adjustments — basic photo editing for a placed image. The values
// sit on the image annotation (like effects do) and are applied to the
// image's pixels BEFORE any filter, so a Threshold or Halftone filter
// works on the adjusted photo. Live preview and Export PDF run the same
// applyPhotoAdjust, so what you see is what exports.
const adjustSlider = (prop, label, fallback = 0, min = -100, max = 100) => ({ kind: "slider", prop, label, min, max, fallback });
export const PHOTO_ADJUST_SECTIONS = [
  {
    id: "light", title: "Light",
    controls: [
      adjustSlider("adjExposure", "Exposure"),
      adjustSlider("adjBrightness", "Brightness"),
      adjustSlider("adjContrast", "Contrast"),
      adjustSlider("adjHighlights", "Highlights"),
      adjustSlider("adjShadows", "Shadows"),
    ],
  },
  {
    id: "color", title: "Color",
    controls: [
      adjustSlider("adjSaturation", "Saturation"),
      adjustSlider("adjTemperature", "White balance: cool ↔ warm"),
      adjustSlider("adjTint", "Tint: green ↔ magenta"),
    ],
  },
  {
    id: "levels", title: "Levels",
    controls: [
      adjustSlider("adjBlack", "Black point", 0, 0, 254),
      adjustSlider("adjWhite", "White point", 255, 1, 255),
      adjustSlider("adjGamma", "Midtones (%)", 100, 10, 300),
    ],
  },
];
export const PHOTO_ADJUST_CONTROLS = PHOTO_ADJUST_SECTIONS.flatMap((s) => s.controls);
export const isAdjusted = (ann, control) => ann[control.prop] != null && ann[control.prop] !== control.fallback;
export const hasPhotoAdjust = (ann) => PHOTO_ADJUST_CONTROLS.some((c) => isAdjusted(ann, c));

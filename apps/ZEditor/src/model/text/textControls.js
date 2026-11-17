// Text box settings and text effect definitions, fonts and colour swatches.

import { SHADOW_EFFECT, STROKE_EFFECT } from "../imageEffects.js";

export const AUTO_TEXT_MAX_WIDTH = 320; // a text box with no set width wraps here, on screen and in export
// ---- Text looks — settings for a text box beyond font/size/colour. The
// Format panel builds its controls from these, and both the live box
// (AnnotationText) and Export (drawTextOnCanvas) read the values back
// through textLook, so the two can't drift apart. Stroke and Shadow are
// the same effects images have; the rest are text-only.
export const TEXT_BORDER_PX = 1; // the text box's 1px border takes space like padding does
export const LINE_SPACING_CONTROL = { kind: "slider", prop: "lineSpacing", label: "Line spacing (%)", min: 80, max: 300, fallback: 130 };
export const LETTER_SPACING_CONTROL = { kind: "slider", prop: "letterSpacing", label: "Letter spacing (%)", min: -10, max: 100, fallback: 0 };
export const STRIKE_CONTROL = {
  kind: "select", prop: "strike", label: "Strike-through", fallback: "none",
  options: [{ key: "none", label: "None" }, { key: "line", label: "Line" }, { key: "double", label: "Double" }, { key: "wavy", label: "Wavy" }],
};
export const CASE_CONTROL = {
  kind: "select", prop: "textCase", label: "Letter case", fallback: "none",
  options: [{ key: "none", label: "As typed" }, { key: "upper", label: "UPPERCASE" }, { key: "lower", label: "lowercase" }, { key: "title", label: "Title Case" }, { key: "small", label: "Small caps" }],
};
// Stacked text puts each character on its own line, upright, centred: a
// zine spine or a vertical sign. (Turning the whole box sideways is the
// Angle control.) Drawn on canvas in the editor, straight while typing.
export const VERTICAL_CONTROL = {
  kind: "select", prop: "vertical", label: "Direction", fallback: "none",
  options: [{ key: "none", label: "Horizontal" }, { key: "stacked", label: "Stacked (top to bottom)" }],
};
// Shrinks the font, never grows it past the Size, until the text fits in
// this much height. Set the box's width first (drag its side handle).
export const FIT_HEIGHT_CONTROL = { kind: "slider", prop: "fitHeight", label: "Shrink to fit height (px, 0 = off)", min: 0, max: 1000, fallback: 0 };
export const TEXT_FILL_ALPHA_CONTROL = { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 };
export const TEXT_GRADIENT_EFFECT = {
  key: "textGradient",
  label: "Gradient",
  controls: [
    { kind: "color", prop: "gradientColor", label: "To color", fallback: "#ffe066" },
    { kind: "slider", prop: "gradientAlpha", label: "To opacity (%)", min: 0, max: 100, fallback: 100 },
    { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90 },
    { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0 },
    { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100 },
  ],
  hint: "Fades from the text color to this one, across the whole text box.",
};
export const TEXT_LABEL_EFFECT = {
  key: "labelBox",
  label: "Label",
  controls: [
    { kind: "color", prop: "labelColor", label: "Color", fallback: "#000000" },
    { kind: "slider", prop: "labelAlpha", label: "Opacity (%)", min: 0, max: 100, fallback: 100 },
    { kind: "slider", prop: "labelPadding", label: "Padding (px)", min: 0, max: 40, fallback: 6 },
    { kind: "slider", prop: "labelRadius", label: "Corner radius (px)", min: 0, max: 40, fallback: 0 },
  ],
  hint: "A filled box behind the text — a black bar, a highlighter strip, a tape label.",
};
// Ransom-note lettering: each letter gets its own seeded tilt, up/down
// shift and size, optionally on a cut-out paper tile. Tilt, shift and size
// are maximums; the actual values per letter come from the Variation seed.
export const RANSOM_EFFECT = {
  key: "ransom",
  label: "Ransom",
  controls: [
    { kind: "slider", prop: "ransomTilt", label: "Tilt (°)", min: 0, max: 45, fallback: 8 },
    { kind: "slider", prop: "ransomShift", label: "Up/down (%)", min: 0, max: 50, fallback: 10 },
    { kind: "slider", prop: "ransomSize", label: "Size variation (%)", min: 0, max: 60, fallback: 12 },
    {
      kind: "select", prop: "ransomTiles", label: "Letter tiles", fallback: "none",
      options: [{ key: "none", label: "None" }, { key: "paper", label: "Cut-out paper" }],
    },
    { kind: "slider", prop: "ransomVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  ],
  hint: "Each letter gets its own tilt, height and size, like letters cut from a magazine.",
};
// Worn-away text: nicks, specks and scratches knocked out of the letters.
export const DISTRESS_EFFECT = {
  key: "distress",
  label: "Distress",
  controls: [
    { kind: "slider", prop: "distressGrit", label: "Nicks", min: 0, max: 100, fallback: 40 },
    { kind: "slider", prop: "distressDust", label: "Specks", min: 0, max: 100, fallback: 25 },
    { kind: "slider", prop: "distressScratches", label: "Scratches", min: 0, max: 100, fallback: 20 },
    { kind: "slider", prop: "distressVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  ],
};
// Text along an arc: positive bends it up like a rainbow, negative down
// like a smile. 100% is half a circle across the widest line.
export const CURVE_EFFECT = {
  key: "curve",
  label: "Curve",
  controls: [
    { kind: "slider", prop: "curveBend", label: "Bend (%)", min: -100, max: 100, fallback: 50 },
  ],
  hint: "Bends each line along an arc. Shown straight while you type.",
};
export const TEXT_EFFECTS = [STROKE_EFFECT, SHADOW_EFFECT, TEXT_GRADIENT_EFFECT, TEXT_LABEL_EFFECT, RANSOM_EFFECT, CURVE_EFFECT, DISTRESS_EFFECT];
export const RANSOM_PAPER_COLORS = ["#f4efe1", "#ffe066", "#ff8fa3", "#8ecae6", "#b7e4c7", "#ffffff"];
// A photo shown through the letters. 100% scale covers the text box; X/Y
// move it by that percent of the box's size (0 = centred). The photo itself
// lives on the text box as fillSrc/fillNatW/fillNatH and replaces the
// colour and gradient while it's set.
export const TEXT_PHOTO_CONTROLS = [
  { kind: "slider", prop: "fillScale", label: "Photo scale (%)", min: 20, max: 400, fallback: 100 },
  { kind: "slider", prop: "fillX", label: "Photo X (%)", min: -100, max: 100, fallback: 0 },
  { kind: "slider", prop: "fillY", label: "Photo Y (%)", min: -100, max: 100, fallback: 0 },
  { kind: "slider", prop: "fillPhotoAlpha", label: "Photo opacity (%)", min: 0, max: 100, fallback: 100 },
];
export const TEXT_PHOTO_PROPS = ["fillSrc", "fillNatW", "fillNatH", ...TEXT_PHOTO_CONTROLS.map((c) => c.prop)];

// Starting font presets, shown before (or alongside) any fonts loaded
// from the browser via the Local Font Access API — see FontCombobox.
// Plain family names, same convention Markdown-to-PDF uses: applied as
// `'${name}', sans-serif` at render time, so an unrecognized/unavailable
// name just falls back to the browser's default sans rather than erroring.
export const DEFAULT_FONT_OPTIONS = ["Inter", "Georgia", "Courier New", "Comic Sans MS", "Impact"];

export const TEXT_COLOR_SWATCHES = ["#1a1a1a", "#ffffff", "#dd531a", "#2563eb", "#16a34a", "#dc2626", "#eab308"];

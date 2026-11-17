// Rectangle/ellipse settings, fill controls and default sizes.

import { BLEND_CONTROL, OPACITY_CONTROL } from "./controls.js";

// A rectangle's fill is solid, or a two-colour gradient. Each colour has
// its own opacity, so a gradient can fade out to nothing; the plain
// Opacity control below still fades the whole rectangle as one piece.
const isGradientFill = (v) => v.fillType !== "solid";
export const RECT_CONTROLS = [
  {
    kind: "select", prop: "fillType", label: "Fill", fallback: "solid",
    options: [{ key: "solid", label: "Solid" }, { key: "linear", label: "Linear gradient" }, { key: "radial", label: "Radial gradient" }],
  },
  { kind: "color", prop: "fillColor", label: "Fill color", fallback: "#1a1a1a" },
  { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 },
  { kind: "color", prop: "gradientColor", label: "Gradient color", fallback: "#ffe066", showIf: isGradientFill },
  { kind: "slider", prop: "gradientAlpha", label: "Gradient opacity (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
  { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90, showIf: (v) => v.fillType === "linear" },
  { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0, showIf: isGradientFill },
  { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
  OPACITY_CONTROL,
  BLEND_CONTROL,
];
// What Rasterize to Image clears: the fill. Opacity and blend carry over to the image.
export const RECT_FILL_PROPS = RECT_CONTROLS.map((c) => c.prop).filter((p) => p !== OPACITY_CONTROL.prop && p !== BLEND_CONTROL.prop);
// The Format panel shows the fill apart from opacity/blend.
export const RECT_FILL_CONTROLS = RECT_CONTROLS.filter((c) => RECT_FILL_PROPS.includes(c.prop));
export const MIN_RECT_SIZE = 2; // small enough to use a rectangle as a thin rule
export const DEFAULT_RECT_SIZE = { width: 160, height: 110 }; // for a click without a drag

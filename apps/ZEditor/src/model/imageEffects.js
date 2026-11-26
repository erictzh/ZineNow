// Image effect list (edges, stroke, shadow, texture), which edge outline an item uses, and the shadow offset rule.

import { effectSettings } from "./controls.js";
import { STROKE_MITER_LIMIT, shadowLayers, shadowOffsetOf } from "./effectStacks.js";
import { ELLIPSE_EFFECT, ROUNDED_EFFECT, SCISSOR_CUT_EFFECT, TORN_EDGE_EFFECT } from "./edgeShapes.js";
import { ellipseOutline, isEllipse } from "./outlines.js";

export const STROKE_EFFECT = {
  key: "stroke",
  label: "Stroke",
  extraProps: ["strokes"], // pictures and shapes keep any number of strokes in a list (model/effectStacks.js)
  excludes: ["feather"], // a stroke on a faded edge looks wrong, so turning one on turns the other off
  controls: [
    { kind: "color", prop: "strokeColor", label: "Color", fallback: "#000000" },
    { kind: "slider", prop: "strokeThickness", label: "Thickness (px)", min: 1, max: 40, fallback: 4 },
  ],
};
// Every property an effect stores: its on/off flag, its controls' props and any list props.
export const effectPropNames = (effect) => [effect.key, ...effect.controls.map((c) => c.prop), ...(effect.extraProps || [])];
export { STROKE_MITER_LIMIT };
export const SHADOW_EFFECT = {
  key: "shadow",
  label: "Shadow",
  extraProps: ["shadows"],
  controls: [
    { kind: "color", prop: "shadowColor", label: "Color", fallback: "#000000" },
    { kind: "slider", prop: "shadowThickness", label: "Thickness (px)", min: 0, max: 60, fallback: 6 },
    { kind: "slider", prop: "shadowDirection", label: "Direction (°)", min: 0, max: 360, fallback: 135 },
    { kind: "slider", prop: "shadowBlur", label: "Blur (px)", min: 0, max: 40, fallback: 0 },
  ],
  hint: "Direction: 0° is up, 90° right, 180° down, 270° left.",
};
export const TEXTURE_EFFECT = {
  key: "texture",
  label: "Texture",
  controls: [
    { kind: "color", prop: "textureColor", label: "Color", fallback: "#1a1a1a" },
    { kind: "slider", prop: "textureGrit", label: "Grit", min: 0, max: 100, fallback: 40 },
    { kind: "slider", prop: "textureDust", label: "Dust", min: 0, max: 100, fallback: 20 },
    { kind: "slider", prop: "textureScratches", label: "Scratches", min: 0, max: 100, fallback: 15 },
    { kind: "slider", prop: "textureVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  ],
};

// Feather: the edge fades to see-through. Not an edge shape: it works with Rounded, Ellipse, Torn Edge and Scissor cut (the
// fade follows whichever is on). A stroke would sit on a faded edge, so the two switch each other off.
export const FEATHER_EFFECT = {
  key: "feather",
  label: "Feather",
  excludes: ["stroke"],
  controls: [
    { kind: "slider", prop: "featherAmount", label: "Width (% of the short side)", min: 1, max: 100, fallback: 12, hint: "Above 50 the middle never gets fully solid: the fade is wider than half the picture." },
    { kind: "select", prop: "featherFade", label: "Fade", fallback: "smooth", options: [{ key: "smooth", label: "Smooth" }, { key: "linear", label: "Linear" }] },
    {
      kind: "select", prop: "featherSides", label: "Sides", fallback: "all",
      options: [{ key: "all", label: "All round" }, { key: "tb", label: "Top and bottom" }, { key: "lr", label: "Left and right" }, { key: "top", label: "Top only" }, { key: "bottom", label: "Bottom only" }, { key: "left", label: "Left only" }, { key: "right", label: "Right only" }],
      hint: "With an edge shape on (Rounded, Ellipse...) the fade is always all round.",
    },
  ],
};

// Lomo: contrast, colour, a cross-process tint, vignette and grain in one look (render/lomo.js). The presets set all of
// its numbers at once; changing any number after that makes it "Custom".
const lomoPreset = (key, label, v) => ({ key, label, values: { lomoStrength: 100, lomoContrast: 40, lomoSaturation: 30, lomoTint: 40, lomoShadowTint: "#0e5a73", lomoHighlightTint: "#ffb35c", lomoVignette: 55, lomoVignetteSize: 50, lomoVignetteRound: 50, lomoGrain: 20, ...v } });
export const LOMO_CONTROLS = [
  { kind: "slider", prop: "lomoStrength", label: "Strength (%)", min: 0, max: 100, fallback: 100 },
  { kind: "slider", prop: "lomoContrast", label: "Contrast", min: 0, max: 100, fallback: 40 },
  { kind: "slider", prop: "lomoSaturation", label: "Saturation boost", min: -50, max: 100, fallback: 30 },
  { kind: "slider", prop: "lomoTint", label: "Colour shift", min: 0, max: 100, fallback: 40 },
  { kind: "color", prop: "lomoShadowTint", label: "Shadow colour", fallback: "#0e5a73" },
  { kind: "color", prop: "lomoHighlightTint", label: "Highlight colour", fallback: "#ffb35c" },
  { kind: "slider", prop: "lomoVignette", label: "Vignette: darkness", min: 0, max: 100, fallback: 55 },
  { kind: "slider", prop: "lomoVignetteSize", label: "Vignette: how far in", min: 0, max: 100, fallback: 50 },
  { kind: "slider", prop: "lomoVignetteRound", label: "Vignette: round ↔ fits the picture", min: 0, max: 100, fallback: 50 },
  { kind: "slider", prop: "lomoGrain", label: "Grain", min: 0, max: 100, fallback: 20 },
];
export const LOMO_EFFECT = {
  key: "lomo",
  label: "Lomo",
  controls: LOMO_CONTROLS,
  presets: [
    lomoPreset("classic", "Classic", {}),
    lomoPreset("warm", "Warm", { lomoShadowTint: "#6b2d0f", lomoHighlightTint: "#ffd27a", lomoSaturation: 20, lomoGrain: 25 }),
    lomoPreset("teal", "Teal & orange", { lomoShadowTint: "#0a6a78", lomoHighlightTint: "#ff9a4d", lomoTint: 60, lomoContrast: 50 }),
    lomoPreset("faded", "Faded", { lomoContrast: 10, lomoSaturation: -10, lomoTint: 30, lomoShadowTint: "#3a4a6b", lomoHighlightTint: "#f2d8b0", lomoVignette: 35, lomoGrain: 35 }),
  ],
};

// Bevel and Emboss: a lit raised (or pressed) edge made from the outline (render/bevel.js). "Inner bevel" stays on the shape; "Emboss" is wider and
// spills over the edge too. Light direction: where the light comes FROM (0° top, 90° right, 180° bottom, 270° left).
export const BEVEL_EFFECT = {
  key: "bevel",
  label: "Bevel & Emboss",
  controls: [
    { kind: "select", prop: "bevelStyle", label: "Style", fallback: "inner", options: [{ key: "inner", label: "Inner bevel" }, { key: "emboss", label: "Emboss (spills past the edge)" }] },
    { kind: "select", prop: "bevelRaised", label: "Surface", fallback: "up", options: [{ key: "up", label: "Raised" }, { key: "down", label: "Pressed in" }] },
    { kind: "slider", prop: "bevelDepth", label: "Depth (%)", min: 1, max: 100, fallback: 60 },
    { kind: "slider", prop: "bevelSize", label: "Size (px)", min: 1, max: 40, fallback: 8 },
    { kind: "slider", prop: "bevelLight", label: "Light from (°)", min: 0, max: 360, fallback: 315, hint: "0° is the top, 90° the right, 180° the bottom, 270° the left; 315° is the top left." },
    { kind: "color", prop: "bevelHighlightColor", label: "Highlight", fallback: "#ffffff" },
    { kind: "slider", prop: "bevelHighlightOpacity", label: "Highlight strength (%)", min: 0, max: 100, fallback: 75 },
    { kind: "color", prop: "bevelShadowColor", label: "Shadow", fallback: "#000000" },
    { kind: "slider", prop: "bevelShadowOpacity", label: "Shadow strength (%)", min: 0, max: 100, fallback: 60 },
  ],
};

export const IMAGE_EFFECTS = [ROUNDED_EFFECT, ELLIPSE_EFFECT, TORN_EDGE_EFFECT, SCISSOR_CUT_EFFECT, FEATHER_EFFECT, LOMO_EFFECT, STROKE_EFFECT, SHADOW_EFFECT, BEVEL_EFFECT, TEXTURE_EFFECT];

// The active edge shape's outline, or null for a plain rectangle.
export function imageEdgeOutline(ann) {
  if (isEllipse(ann)) return ellipseOutline(ann);
  const edge = IMAGE_EFFECTS.find((effect) => effect.outline && ann[effect.key]);
  return edge ? edge.outline(ann) : null;
}

// ---- Drop shadow — thickness is how far the shadow sits from the image,
// direction is which way it falls, blur softens its edge. Returns null
// when the image has no visible shadow. Values are in the image's own
// page-space, so the live CSS drop-shadow and the export canvas shadow
// share one source (both treat blur as twice the Gaussian std deviation).
export function imageShadowOffset(ann) {
  return imageShadowOffsets(ann)[0] || null;
}

// All the item's shadows that show, top first: [{ x, y, blur, color }] (see model/effectStacks.js).
export function imageShadowOffsets(ann) {
  return shadowLayers(ann).filter((s) => s.thickness > 0 || s.blur > 0).map(shadowOffsetOf);
}

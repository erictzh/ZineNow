// Image effect list (edges, stroke, shadow, texture), which edge outline an item uses, and the shadow offset rule.

import { effectSettings } from "./controls.js";
import { ELLIPSE_EFFECT, ROUNDED_EFFECT, SCISSOR_CUT_EFFECT, TORN_EDGE_EFFECT } from "./edgeShapes.js";
import { ellipseOutline, isEllipse } from "./outlines.js";

export const STROKE_EFFECT = {
  key: "stroke",
  label: "Stroke",
  controls: [
    { kind: "color", prop: "strokeColor", label: "Color", fallback: "#000000" },
    { kind: "slider", prop: "strokeThickness", label: "Thickness (px)", min: 1, max: 40, fallback: 4 },
  ],
};
export const STROKE_MITER_LIMIT = 4; // set explicitly so the live SVG and export canvas agree
export const SHADOW_EFFECT = {
  key: "shadow",
  label: "Shadow",
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
export const IMAGE_EFFECTS = [ROUNDED_EFFECT, ELLIPSE_EFFECT, TORN_EDGE_EFFECT, SCISSOR_CUT_EFFECT, STROKE_EFFECT, SHADOW_EFFECT, TEXTURE_EFFECT];

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
  if (!ann.shadow) return null;
  const { shadowThickness, shadowDirection, shadowBlur, shadowColor } = effectSettings(ann, SHADOW_EFFECT);
  if (shadowThickness <= 0 && shadowBlur <= 0) return null;
  const radians = shadowDirection * Math.PI / 180;
  return {
    x: Math.sin(radians) * shadowThickness,
    y: -Math.cos(radians) * shadowThickness,
    blur: shadowBlur,
    color: shadowColor,
  };
}

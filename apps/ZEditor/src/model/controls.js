// The control-descriptor system: reading control values, and the shared opacity/blend/rotation controls.

export const OPACITY_CONTROL = { kind: "slider", prop: "opacity", label: "Opacity (%)", min: 0, max: 100, fallback: 100 };
// How an item mixes with whatever is under it. Keys are valid both as CSS
// `mix-blend-mode` (live editor) and canvas `globalCompositeOperation`
// (Export), so one value drives both. Multiply darkens like ink on paper;
// Screen lightens (white stays white, so it only shows on darker areas).
export const BLEND_CONTROL = {
  kind: "select", prop: "blend", label: "Blend", fallback: "normal",
  options: [
    { key: "normal", label: "Normal" },
    { key: "multiply", label: "Multiply" },
    { key: "screen", label: "Screen" },
    { key: "overlay", label: "Overlay" },
    { key: "soft-light", label: "Soft Light" },
    { key: "darken", label: "Darken" },
    { key: "lighten", label: "Lighten" },
    { key: "difference", label: "Difference" },
  ],
};

// Rotation of a text box, image, rectangle or ellipse, in degrees clockwise
// about its centre. The box's own x/y/width/height stay unrotated.
export const ANGLE_CONTROL = { kind: "slider", prop: "angle", label: "Rotation (°)", min: 0, max: 359, fallback: 0 };
export const angleOf = (ann) => ann.angle || 0;

// Current values for a list of controls, keyed by each control's
// `prop`, with the control's fallback for anything not set yet.
export function controlValues(source, controls) {
  return Object.fromEntries(controls.map((c) => [c.prop, source[c.prop] != null ? source[c.prop] : c.fallback]));
}

export function effectSettings(ann, effect) {
  return controlValues(ann, effect.controls);
}

export function opacityOf(ann) {
  return controlValues(ann, [OPACITY_CONTROL]).opacity / 100;
}

// "normal" is left unset in CSS and canvas, so unblended items render exactly as before.
export function blendOf(ann) {
  return controlValues(ann, [BLEND_CONTROL]).blend;
}

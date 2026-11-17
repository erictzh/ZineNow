// Edge-shape effects (rounded, ellipse, torn, scissor cut) together with the outline each one produces.

import { effectSettings } from "./controls.js";
import { noiseStream, seededNoise } from "./noise.js";
import { ellipseOutline, pointsToOutline } from "./outlines.js";

// Image effects — the one place an effect and its settings are defined.
// `key` is the on/off flag on the annotation, each control's `prop` is
// where its value lives. The Format panel's buttons and cards are built
// from these, and rendering reads values through effectSettings, so
// adding a setting here is all the panel needs. An `outline` makes the
// effect an edge shape: only one can be active on an image at a time.
// Edge sizes are percentages of the image's short side, so a shape
// keeps its look when the image is resized or exported.
export const ROUNDED_EFFECT = {
  key: "rounded",
  label: "Rounded",
  outline: roundedOutline,
  controls: [
    { kind: "slider", prop: "roundedRadius", label: "Radius (%)", min: 0, max: 50, fallback: 12 },
  ],
};
// Masks an image to the ellipse that fits its box — a circle on a
// square image. Rectangles don't offer it: the Ellipse tool covers them.
export const ELLIPSE_EFFECT = {
  key: "ellipseEdge",
  label: "Ellipse",
  outline: ellipseOutline,
  controls: [],
};
export const TORN_EDGE_EFFECT = {
  key: "tornEdge",
  label: "Torn Edge",
  outline: tornEdgeOutline,
  controls: [
    { kind: "slider", prop: "tornSize", label: "Tooth size (%)", min: 2, max: 40, fallback: 10 },
    { kind: "slider", prop: "tornDepth", label: "Depth (%)", min: 0, max: 30, fallback: 6 },
    { kind: "slider", prop: "tornVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  ],
};
export const SCISSOR_CUT_EFFECT = {
  key: "scissorCut",
  label: "Scissor Cut",
  outline: scissorCutOutline,
  controls: [
    { kind: "slider", prop: "scissorCuts", label: "Cuts per side", min: 1, max: 12, fallback: 2 },
    { kind: "slider", prop: "scissorDepth", label: "Depth (%)", min: 0, max: 25, fallback: 8 },
    { kind: "slider", prop: "scissorVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
  ],
};

function roundedOutline(ann) {
  const { width: w, height: h } = ann;
  const r = Math.min(w, h) * effectSettings(ann, ROUNDED_EFFECT).roundedRadius / 100;
  const corner = (x, y) => `A${r} ${r} 0 0 1 ${x} ${y}`;
  return `M${r} 0H${w - r}${corner(w, r)}V${h - r}${corner(w - r, h)}H${r}${corner(0, h - r)}V${r}${corner(r, 0)}Z`;
}

// A few long straight cuts: each side is split into segments whose
// corners land at uneven spots, nudged inward by a varying amount.
function scissorCutOutline(ann) {
  const { width: w, height: h } = ann;
  const { scissorCuts, scissorDepth, scissorVariation } = effectSettings(ann, SCISSOR_CUT_EFFECT);
  const jitter = Math.min(w, h) * scissorDepth / 100;
  const noise = noiseStream(scissorVariation);
  const onSide = [
    (t, inset) => [w * t, inset],
    (t, inset) => [w - inset, h * t],
    (t, inset) => [w * (1 - t), h - inset],
    (t, inset) => [inset, h * (1 - t)],
  ];
  const points = [];
  onSide.forEach((place) => {
    for (let cut = 0; cut < scissorCuts; cut++) {
      const t = cut === 0 ? 0 : (cut + (noise() - 0.5) * 0.6) / scissorCuts;
      points.push(place(t, noise() * jitter));
    }
  });
  return pointsToOutline(points);
}

function tornEdgeOutline(ann) {
  const { width, height } = ann;
  const shortSide = Math.min(width, height);
  const { tornSize, tornDepth, tornVariation } = effectSettings(ann, TORN_EDGE_EFFECT);
  const step = Math.max(0.5, shortSide * tornSize / 100);
  const jitter = shortSide * tornDepth / 100;
  // Once tuned, teeth are fitted to land on each corner, or large teeth
  // would slice the corners off. An untuned tear keeps its original shape.
  const tuned = ann.tornSize != null || ann.tornDepth != null;
  const stepX = tuned ? width / Math.max(1, Math.round(width / step)) : step;
  const stepY = tuned ? height / Math.max(1, Math.round(height / step)) : step;
  const eps = 1e-6; // keeps the last point when float steps overshoot a corner
  const noise = (i) => seededNoise(i, tornVariation);
  const points = [];
  let i = 0;
  for (let x = 0; x <= width + eps; x += stepX) points.push([x, noise(i++) * jitter]);
  for (let y = stepY; y <= height + eps; y += stepY) points.push([width - noise(i++) * jitter, y]);
  for (let x = width - stepX; x >= -eps; x -= stepX) points.push([x, height - noise(i++) * jitter]);
  for (let y = height - stepY; y >= stepY - eps; y -= stepY) points.push([noise(i++) * jitter, y]);
  return pointsToOutline(points);
}

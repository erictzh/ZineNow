// The picture maths for "Remove background" (no browser parts, so it can be tested): getting a picture ready for the model and turning
// the model's answer into a see-through cut-out. The model is U²-Netp (Apache-2.0): it looks at a 320 x 320 version of the picture and
// answers with how likely each pixel is part of the main subject.

export const SEG_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

// `rgba`: SEG_SIZE x SEG_SIZE x 4 bytes. Returns the model's input: 3 x SEG_SIZE x SEG_SIZE floats (colours scaled by the brightest
// value, then the usual picture-model normalisation).
export function segInput(rgba, size = SEG_SIZE) {
  const n = size * size;
  let max = 1;
  for (let i = 0; i < n; i++) { const o = i * 4; if (rgba[o] > max) max = rgba[o]; if (rgba[o + 1] > max) max = rgba[o + 1]; if (rgba[o + 2] > max) max = rgba[o + 2]; }
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / max - MEAN[c]) / STD[c];
  return out;
}

// The model's answer (any range) stretched to 0..1 (0 = background, 1 = subject).
export function segMask(data) {
  const n = data.length;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const range = hi - lo || 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (data[i] - lo) / range;
  return out;
}

// Edge cut-off (0..1) and softness (0..1): the see-through amount for a mask value. Below the cut-off by `soft` it is fully see-through,
// above it by `soft` fully solid, and it fades in between.
export function softCut(v, cutoff, soft) {
  const half = Math.max(0.0001, soft);
  const a = (v - (cutoff - half)) / (2 * half);
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

// Turns `mask` (0..1 floats, side x side) into alpha bytes (side x side).
export function maskToAlpha(mask, cutoff, soft) {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.round(softCut(mask[i], cutoff, soft) * 255);
  return out;
}

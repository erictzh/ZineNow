// The picture maths for "Remove background" (no browser parts, so it can be tested): getting a picture ready for the model and turning
// the model's answer into a see-through cut-out. The model is U²-Netp (Apache-2.0): it looks at a 320 x 320 version of the picture and
// answers with how likely each pixel is part of the main subject.

export const SEG_SIZE = 320; // U²-Netp's size (kept for the tests)

// How each model wants its picture: the square size, the colour normalisation, whether colours are first scaled by the brightest value
// (U²-Netp) or by 255 (MODNet), and how its answer becomes a 0..1 mask ("minmax": stretched; "clamp": already 0..1).
export const SEG_PREP = {
  u2netp: { size: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225], byBrightest: true, mask: "minmax" },
  modnet: { size: 512, mean: [0.5, 0.5, 0.5], std: [0.5, 0.5, 0.5], byBrightest: false, mask: "clamp" },
};

// `rgba`: size x size x 4 bytes. Returns the model's input: 3 x size x size floats.
export function segInput(rgba, prep = SEG_PREP.u2netp) {
  const size = typeof prep === "number" ? SEG_PREP.u2netp.size : prep.size;
  const p = typeof prep === "number" ? SEG_PREP.u2netp : prep;
  const n = size * size;
  let max = 255;
  if (p.byBrightest) { max = 1; for (let i = 0; i < n; i++) { const o = i * 4; if (rgba[o] > max) max = rgba[o]; if (rgba[o + 1] > max) max = rgba[o + 1]; if (rgba[o + 2] > max) max = rgba[o + 2]; } }
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / max - p.mean[c]) / p.std[c];
  return out;
}

// The model's answer as a 0..1 mask (0 = background, 1 = subject). "minmax" stretches any range; "clamp" keeps a matte that is already 0..1.
export function segMask(data, how = "minmax") {
  const n = data.length;
  const out = new Float32Array(n);
  if (how === "clamp") { for (let i = 0; i < n; i++) out[i] = data[i] < 0 ? 0 : data[i] > 1 ? 1 : data[i]; return out; }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  const range = hi - lo || 1;
  for (let i = 0; i < n; i++) out[i] = (data[i] - lo) / range;
  return out;
}

// Edge cut-off (0..1) and softness (0..1): the see-through amount for a mask value. Below the cut-off by `soft` it is fully see-through,
// above it by `soft` fully solid, and it fades in between.
// The soft part narrows near 0 and 1 (it can't reach past the ends), so a very small cut-off still cuts cleanly.
export function softCut(v, cutoff, soft) {
  if (cutoff <= 0) return 1; // a cut-off of 0 cuts nothing: everything stays (the model's lowest values would otherwise come out half see-through)
  const half = Math.max(0.0001, Math.min(soft, cutoff, 1 - cutoff));
  const a = (v - (cutoff - half)) / (2 * half);
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

// Turns `mask` (0..1 floats, side x side) into alpha bytes (side x side).
export function maskToAlpha(mask, cutoff, soft) {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.round(softCut(mask[i], cutoff, soft) * 255);
  return out;
}

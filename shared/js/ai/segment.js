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

// Edge cut-off (0..1) and softness (0..1): the see-through amount for a mask value. At or below the cut-off it is fully see-through; above
// it, it fades in over `soft`, and is fully solid from cutoff + soft up. (The fade only goes upwards from the cut-off: the models give
// the background tiny values that are not exactly 0, and a fade that reached below the cut-off would leave that background half visible.)
// The fade narrows near 1 (it can't reach past the end). A cut-off of 0 cuts nothing.
export function softCut(v, cutoff, soft) {
  if (cutoff <= 0) return 1;
  const width = Math.max(0.0001, Math.min(soft, 1 - cutoff));
  const a = (v - cutoff) / width;
  return a < 0 ? 0 : a > 1 ? 1 : a;
}

// Turns `mask` (0..1 floats, side x side) into alpha bytes (side x side).
export function maskToAlpha(mask, cutoff, soft) {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.round(softCut(mask[i], cutoff, soft) * 255);
  return out;
}

// Numbers that describe a mask (0..1 floats), for the debug window: min / max / mean, how many values fall in each range, percentiles, and the
// split a automatic method (Otsu) would pick. Helps to see why a cut-off leaves background behind.
const BUCKETS = [1e-4, 1e-3, 1e-2, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0000001];
export function maskStats(mask) {
  const n = mask.length;
  let lo = Infinity, hi = -Infinity, sum = 0;
  const counts = new Array(BUCKETS.length).fill(0);
  const BINS = 2000, hist = new Float64Array(BINS);
  for (let i = 0; i < n; i++) {
    const v = mask[i];
    if (v < lo) lo = v; if (v > hi) hi = v; sum += v;
    let b = 0; while (v >= BUCKETS[b]) b++;
    counts[b]++;
    hist[Math.min(BINS - 1, Math.floor(v * BINS))]++;
  }
  const pct = (p) => { let acc = 0; for (let b = 0; b < BINS; b++) { acc += hist[b]; if (acc >= p * n) return (b + 0.5) / BINS; } return 1; };
  // Otsu on 256 linear bins
  const h2 = new Float64Array(256); for (let b = 0; b < BINS; b++) h2[Math.min(255, Math.floor(b * 256 / BINS))] += hist[b];
  let total = 0, wsum = 0; for (let b = 0; b < 256; b++) { total += h2[b]; wsum += b * h2[b]; }
  let wB = 0, sB = 0, best = 0, bestT = 0;
  for (let t = 0; t < 256; t++) { wB += h2[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * h2[t]; const mB = sB / wB, mF = (wsum - sB) / wF, between = wB * wF * (mB - mF) * (mB - mF); if (between > best) { best = between; bestT = t; } }
  return {
    n, min: lo, max: hi, mean: sum / n,
    below: BUCKETS.map((lt, i) => ({ lt: i === BUCKETS.length - 1 ? 1 : lt, share: counts[i] / n })),
    p5: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95),
    otsu: (bestT + 1) / 256,
  };
}

// MobileSAM's picture maths (no browser parts, so it can be tested). The image reader (encoder) takes a plain height x width x 3 picture with
// colours 0..255 whose long side is 1024 (it scales and pads inside). The mask maker (decoder) takes the reader's embeddings and the clicks.

export const SAM_SIZE = 1024;

// The size the picture is shrunk to for the reader (long side 1024) and the scale factor k.
export function samDims(w, h) {
  const k = SAM_SIZE / Math.max(w, h);
  return { k, w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

// `rgba`: w x h x 4 bytes (the shrunk picture). Returns the reader's input floats, height x width x 3, 0..255.
export function samInput(rgba, w, h) {
  const out = new Float32Array(w * h * 3);
  for (let i = 0, o = 0; i < w * h; i++) { out[o++] = rgba[i * 4]; out[o++] = rgba[i * 4 + 1]; out[o++] = rgba[i * 4 + 2]; }
  return out;
}

// The clicks as the decoder wants them. `points`: [{ x, y, label }] in the (work) picture's pixels, label 1 = add, 0 = take away; `k` = the reader's scale.
// A final (0,0) point with label -1 is the usual "no box" padding. Returns { coords: Float32Array(n*2), labels: Float32Array(n), n }.
export function samPoints(points, k) {
  const n = points.length + 1, coords = new Float32Array(n * 2), labels = new Float32Array(n);
  points.forEach((p, i) => { coords[i * 2] = p.x * k; coords[i * 2 + 1] = p.y * k; labels[i] = p.label ? 1 : 0; });
  labels[n - 1] = -1;
  return { coords, labels, n };
}

// The decoder's answer -> one mask. `data`: the masks (k channels of mh x mw logits), `dims` the tensor's dims, `iou` the quality scores (or null).
// With several channels the best-scoring one is used. A value above 0 means selected. Returns { mask: Uint8Array (1 = selected), w, h, best, coverage }.
export function pickMask(data, dims, iou) {
  const mw = dims[dims.length - 1], mh = dims[dims.length - 2], kk = dims.length === 4 ? dims[1] : 1;
  let best = 0;
  if (iou && kk > 1) for (let i = 1; i < kk; i++) if (iou[i] > iou[best]) best = i;
  const mask = new Uint8Array(mw * mh);
  let on = 0;
  const base = best * mw * mh;
  for (let i = 0; i < mask.length; i++) if (data[base + i] > 0) { mask[i] = 1; on++; }
  return { mask, w: mw, h: mh, best, coverage: on / mask.length };
}

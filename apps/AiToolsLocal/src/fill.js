// The picture maths of the AI object remover, with no browser objects in it (so tests/aitools-fill.test.js can run it).
//
// The model works on a 512 x 512 square. For a big picture the app cuts a square window round the area to remove (with
// some surroundings for context), shrinks or enlarges it to 512, lets the model fill it, scales the answer back to the
// window's size and pastes it into the picture, only where the area was (its edge softened a little). Everything outside
// the window stays exactly as it was.

export const MODEL_SIZE = 512;
export const CONTEXT = 1.5; // the window is at least this many times as big as the area to remove

// The box round every marked pixel: { x0, y0, x1, y1 } (inclusive), or null when nothing is marked.
export function holeBounds(mask, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!mask[row + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

// The marked area made `r` pixels bigger all round (a square growth, done one direction at a time).
export function dilate(mask, w, h, r) {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w; let last = -1e9;
    for (let x = 0; x < w; x++) { if (mask[row + x]) last = x; if (x - last <= r) tmp[row + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[row + x]) last = x; if (last - x <= r) tmp[row + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

// The square window to hand the model: { x, y, side } in picture pixels, or null when the area can't fit in one (it is bigger
// than the picture's short side allows). Centred on the area, kept inside the picture.
export function cropWindow(bounds, w, h) {
  const bw = bounds.x1 - bounds.x0 + 1, bh = bounds.y1 - bounds.y0 + 1;
  const need = Math.max(bw, bh);
  const short = Math.min(w, h);
  if (need > short * 0.92) return null;
  let side = Math.max(MODEL_SIZE, Math.ceil(need * CONTEXT));
  side = Math.min(side, short);
  const cx = (bounds.x0 + bounds.x1 + 1) / 2, cy = (bounds.y0 + bounds.y1 + 1) / 2;
  const x = Math.round(Math.min(Math.max(0, cx - side / 2), w - side));
  const y = Math.round(Math.min(Math.max(0, cy - side / 2), h - side));
  return { x, y, side };
}

// The mask for the model: 1 where the area is, sampled from the window (any marked pixel in a block marks the whole block).
export function windowMask(mask, w, crop) {
  const out = new Uint8Array(MODEL_SIZE * MODEL_SIZE);
  const k = crop.side / MODEL_SIZE;
  for (let my = 0; my < MODEL_SIZE; my++) {
    const y0 = crop.y + Math.floor(my * k), y1 = crop.y + Math.max(Math.floor(my * k), Math.ceil((my + 1) * k) - 1);
    for (let mx = 0; mx < MODEL_SIZE; mx++) {
      const x0 = crop.x + Math.floor(mx * k), x1 = crop.x + Math.max(Math.floor(mx * k), Math.ceil((mx + 1) * k) - 1);
      let hit = 0;
      for (let yy = y0; yy <= y1 && !hit; yy++) for (let xx = x0; xx <= x1; xx++) if (mask[yy * w + xx]) { hit = 1; break; }
      out[my * MODEL_SIZE + mx] = hit;
    }
  }
  return out;
}

// The model's input: 4 channels, as float numbers. Channel 0 is "known - 0.5" (0.5 where the picture is known, -0.5 in the area to
// fill); channels 1-3 are the picture's red, green, blue scaled to -1..1, with the area blanked to 0.
// `rgba`: the 512 x 512 window of the picture (RGBA bytes); `hole`: Uint8Array of 512 x 512 (1 = fill this).
export function buildInput(rgba, hole) {
  const n = MODEL_SIZE * MODEL_SIZE;
  const x = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) {
    const known = hole[i] ? 0 : 1;
    x[i] = known - 0.5;
    for (let c = 0; c < 3; c++) x[(c + 1) * n + i] = (rgba[i * 4 + c] / 127.5 - 1) * known;
  }
  return x;
}

// The model's answer (3 channels of -1..1 numbers) as RGBA bytes.
export function outputToRgba(out) {
  const n = MODEL_SIZE * MODEL_SIZE;
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = (out[c * n + i] + 1) * 127.5;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

// How much of the answer to use at each pixel of the window (0..1): all of it inside the area, and a short fade just outside it so
// the join does not show. `mask`: the whole picture's mask, `w`: its width.
export function blendWeights(mask, w, crop, feather) {
  const s = crop.side;
  const inside = new Uint8Array(s * s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) inside[y * s + x] = mask[(crop.y + y) * w + crop.x + x];
  if (feather <= 0) return Float32Array.from(inside);
  // average over a (2*feather+1) square: a soft ring round the area, kept at 1 inside it
  const a = new Float32Array(s * s), r = feather;
  const rowSum = new Float32Array(s * s);
  for (let y = 0; y < s; y++) {
    let sum = 0; const row = y * s;
    for (let x = -r; x < s + r; x++) {
      const add = x + r, sub = x - r - 1;
      if (add < s && add >= 0) sum += inside[row + add];
      if (sub >= 0 && sub < s) sum -= inside[row + sub];
      if (x >= 0 && x < s) rowSum[row + x] = sum;
    }
  }
  const win = 2 * r + 1;
  for (let x = 0; x < s; x++) {
    let sum = 0;
    for (let y = -r; y < s + r; y++) {
      const add = y + r, sub = y - r - 1;
      if (add < s && add >= 0) sum += rowSum[add * s + x];
      if (sub >= 0 && sub < s) sum -= rowSum[sub * s + x];
      if (y >= 0 && y < s) a[y * s + x] = Math.min(1, (sum / (win * win)) * 2);
    }
  }
  for (let i = 0; i < a.length; i++) if (inside[i]) a[i] = 1;
  return a;
}

// Pastes the answer into the picture: `image` (RGBA bytes, width w) is changed in place inside `crop`, `answer` is the answer scaled
// to the window's size (RGBA bytes, side x side), `weights` from blendWeights.
export function paste(image, w, crop, answer, weights) {
  const s = crop.side;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const a = weights[y * s + x];
      if (a <= 0) continue;
      const d = ((crop.y + y) * w + crop.x + x) * 4, o = (y * s + x) * 4;
      for (let c = 0; c < 3; c++) image[d + c] = image[d + c] + (answer[o + c] - image[d + c]) * a;
    }
  }
}

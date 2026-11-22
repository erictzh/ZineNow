// Pattern fill: fills a hole by copying real texture from elsewhere in the same picture (exemplar-based inpainting,
// Criminisi, Perez and Toyama 2004). Pure number crunching, no canvas, so it is testable.
//
// The hole is filled from its edge inwards, one patch at a time. Each step takes the edge pixel with the highest
// priority (a lot of its patch already known, and an edge in the picture running into the hole: so structure goes
// first), finds the best-matching fully-known patch in the picture (smallest colour difference over the known part of
// the target patch) and copies that patch's pixels into the hole part. The copied pixels are real picture, with real
// grain and texture, which the smooth fills can't give. It does well on textures and patterns (grass, brick, asphalt,
// foliage, halftone) and lines that run through the hole; it can't invent what isn't in the picture.
//
//   await patchFill(rgba, width, height, hole, { shouldStop })  ->  true when filled, false if it couldn't
//
// `rgba`/`hole` as in render/inpaint.js (the hole's pixels are overwritten in place). It gives the browser a turn every
// ~30 ms, so a big area doesn't freeze the page; `shouldStop()` (optional) is asked then. Returns false when the hole
// is bigger than MAX_HOLE_SIDE, or no patch of the picture is free of the hole to copy from.

const DEFAULT_HALF = 7; // patches are 15 x 15 (bigger ones keep more of a pattern, e.g. brick courses)
const DEFAULT_REACH = 80; // px of the picture kept round the hole's box to copy from
export const MAX_HOLE_SIDE = 360;
const MAX_CANDIDATES = 3000; // patches tried per step (spread evenly over the picture)

export async function patchFill(rgba, width, height, hole, options = {}) {
  const HALF = options.half || DEFAULT_HALF;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!hole[y * width + x]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0 || x1 - x0 + 1 > MAX_HOLE_SIDE || y1 - y0 + 1 > MAX_HOLE_SIDE) return false;
  const MARGIN = Math.max(HALF * 3, Math.round(options.reach || DEFAULT_REACH));
  const bx = Math.max(0, x0 - MARGIN), by = Math.max(0, y0 - MARGIN);
  const w = Math.min(width, x1 + 1 + MARGIN) - bx, h = Math.min(height, y1 + 1 + MARGIN) - by;

  const img = new Float32Array(w * h * 4);
  const known = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (by + y) * width + bx + x, d = y * w + x;
    known[d] = hole[s] ? 0 : 1;
    for (let c = 0; c < 4; c++) img[d * 4 + c] = rgba[s * 4 + c];
  }
  const startKnown = known.slice();

  // Patches to copy from: centres whose whole (2*HALF+1)^2 window is known, spread evenly down to MAX_CANDIDATES.
  const sat = new Int32Array((w + 1) * (h + 1)); // how many hole pixels in a window (summed-area table)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sat[(y + 1) * (w + 1) + x + 1] = (known[y * w + x] ? 0 : 1) + sat[y * (w + 1) + x + 1] + sat[(y + 1) * (w + 1) + x] - sat[y * (w + 1) + x];
  const holesIn = (ax, ay, bxx, byy) => sat[(byy + 1) * (w + 1) + bxx + 1] - sat[ay * (w + 1) + bxx + 1] - sat[(byy + 1) * (w + 1) + ax] + sat[ay * (w + 1) + ax];
  const all = [];
  for (let y = HALF; y < h - HALF; y++) for (let x = HALF; x < w - HALF; x++) if (holesIn(x - HALF, y - HALF, x + HALF, y + HALF) === 0) all.push(y * w + x);
  if (!all.length) return false;
  const stepEvery = Math.max(1, Math.ceil(all.length / (options.candidates || MAX_CANDIDATES)));
  const cands = [];
  for (let i = 0; i < all.length; i += stepEvery) cands.push(all[i]);

  const conf = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) conf[i] = known[i] ? 1 : 0;
  const luma = (i) => 0.299 * img[i * 4] + 0.587 * img[i * 4 + 1] + 0.114 * img[i * 4 + 2];
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  const isFront = (i) => {
    if (known[i]) return false;
    const x = i % w, y = (i - x) / w;
    return (x > 0 && known[i - 1]) || (x < w - 1 && known[i + 1]) || (y > 0 && known[i - w]) || (y < h - 1 && known[i + w]);
  };

  // Priority = confidence x data term (how much an edge in the picture runs into the hole here).
  const prio = new Float32Array(w * h);
  const priorityAt = (i) => {
    const x = i % w, y = (i - x) / w;
    let sum = 0, n = 0;
    for (let yy = Math.max(0, y - HALF); yy <= Math.min(h - 1, y + HALF); yy++) for (let xx = Math.max(0, x - HALF); xx <= Math.min(w - 1, x + HALF); xx++) { sum += conf[yy * w + xx]; n++; }
    const confidence = sum / n;
    // the picture's strongest gradient among the known pixels beside this one, turned a quarter (the isophote)
    let gx = 0, gy = 0, best = 0;
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
      const j = at(xx, yy);
      if (j < 0 || !known[j]) continue;
      const l = at(xx - 1, yy), r = at(xx + 1, yy), u = at(xx, yy - 1), d = at(xx, yy + 1);
      if (l < 0 || r < 0 || u < 0 || d < 0 || !known[l] || !known[r] || !known[u] || !known[d]) continue;
      const dx = (luma(r) - luma(l)) / 2, dy = (luma(d) - luma(u)) / 2, m = dx * dx + dy * dy;
      if (m > best) { best = m; gx = dx; gy = dy; }
    }
    // the direction pointing out of the known part
    let nx = 0, ny = 0;
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      const j = at(x + xx, y + yy);
      const k = j >= 0 && known[j] ? 1 : 0;
      nx += xx * k; ny += yy * k;
    }
    const nl = Math.hypot(nx, ny) || 1;
    const data = Math.abs((-gy) * (nx / nl) + gx * (ny / nl)) / 255 + 0.001;
    return confidence * data;
  };

  const front = new Set();
  for (let i = 0; i < w * h; i++) if (isFront(i)) { front.add(i); prio[i] = priorityAt(i); }

  const side = 2 * HALF + 1;
  const seed = options.seed || 0;
  let rs = (seed * 2654435761) >>> 0 || 1; // a seeded generator for the variation
  const rand = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let lastYield = Date.now();
  while (front.size) {
    let pi = -1, bp = -1;
    for (const i of front) if (prio[i] > bp) { bp = prio[i]; pi = i; }
    const px = pi % w, py = (pi - px) / w;

    // the known part of the target patch
    const tOff = [], tRgb = [];
    for (let dy = -HALF; dy <= HALF; dy++) for (let dx = -HALF; dx <= HALF; dx++) {
      const j = at(px + dx, py + dy);
      if (j < 0 || !known[j]) continue;
      tOff.push(dy * w + dx); tRgb.push(img[j * 4], img[j * 4 + 1], img[j * 4 + 2]);
    }
    // the best match
    // (with a variation number, one of the three best is taken, picked by that number: another number, other patches)
    let bestC = -1, bestD = Infinity;
    const top = [], topD = [];
    for (let k = 0; k < cands.length; k++) {
      const c = cands[k];
      let d = 0;
      const limit = seed ? (topD.length < 3 ? Infinity : topD[2]) : bestD;
      for (let t = 0; t < tOff.length && d < limit; t++) {
        const o = (c + tOff[t]) * 4;
        const a = img[o] - tRgb[t * 3], b = img[o + 1] - tRgb[t * 3 + 1], e = img[o + 2] - tRgb[t * 3 + 2];
        d += a * a + b * b + e * e;
      }
      if (d < bestD) { bestD = d; bestC = c; }
      if (seed && d < limit) {
        let at = topD.length; while (at > 0 && topD[at - 1] > d) at--;
        top.splice(at, 0, c); topD.splice(at, 0, d);
        if (top.length > 3) { top.pop(); topD.pop(); }
      }
    }
    if (bestC < 0) return false;
    if (seed && top.length) bestC = top[Math.floor(rand() * top.length)];

    // copy into the hole part of the patch
    const cf = conf[pi] > 0 ? conf[pi] : prio[pi];
    const cx = bestC % w, cy = (bestC - cx) / w;
    const touched = [];
    for (let dy = -HALF; dy <= HALF; dy++) for (let dx = -HALF; dx <= HALF; dx++) {
      const j = at(px + dx, py + dy);
      if (j < 0 || known[j]) continue;
      const src = (cy + dy) * w + cx + dx;
      for (let c = 0; c < 4; c++) img[j * 4 + c] = img[src * 4 + c];
      known[j] = 1; conf[j] = Math.min(1, Math.max(cf, 0.05)); front.delete(j); touched.push(j);
    }
    // the front moves: the patch's ring joins or leaves it, and the priorities near the patch change
    for (let dy = -HALF - 1; dy <= HALF + 1; dy++) for (let dx = -HALF - 1; dx <= HALF + 1; dx++) {
      const j = at(px + dx, py + dy);
      if (j < 0) continue;
      if (isFront(j)) front.add(j); else front.delete(j);
    }
    for (let dy = -side; dy <= side; dy++) for (let dx = -side; dx <= side; dx++) {
      const j = at(px + dx, py + dy);
      if (j >= 0 && front.has(j)) prio[j] = priorityAt(j);
    }

    if (Date.now() - lastYield > 30) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = Date.now();
      if (options.shouldStop && options.shouldStop()) return false;
    }
  }

  // back into the picture: the pixels that were hole
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = y * w + x;
    if (startKnown[d]) continue;
    const s = (by + y) * width + bx + x;
    for (let c = 0; c < 4; c++) rgba[s * 4 + c] = img[d * 4 + c];
  }
  return true;
}

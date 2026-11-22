// Fills a hole in a picture from the pixels around it. Pure number crunching (no canvas), so it is testable.
//
//   fillFromSurroundings(rgba, width, height, hole, style)
//
// `rgba` is the picture's pixels (Uint8ClampedArray, 4 per pixel), `hole` a Uint8Array of width*height with 1 where
// the pixels are to be replaced. The hole's pixels are overwritten in place; every other pixel is left alone.
// Two styles:
//   "smooth"  the hole becomes the smoothest blend of the colours round it (a harmonic fill: it solves Laplace's
//             equation, so the edge colours spread inwards with no lines or texture). Good for plain paper,
//             flat colours and soft gradients.
//   "detail"  Telea's fast-marching inpainting (what OpenCV calls INPAINT_TELEA): the hole is filled from its
//             edge inwards, each pixel from the known pixels within a few px, weighted towards those in the
//             direction of the edge, with their gradients carried along, so lines and edges run on through the
//             hole. Good for scratches, text on a photo, small marks; a big hole turns blurry.
// All four channels (alpha too) are filled the same way.

const MARGIN = 32; // px of the surroundings kept round the hole's box
const MAX_SIDE = { smooth: 1600, detail: 900 }; // a bigger box is worked on shrunk, then scaled back up

export function fillFromSurroundings(rgba, width, height, hole, style) {
  // The hole's box
  let x0 = width, y0 = height, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!hole[y * width + x]) continue;
    count++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (!count) return false;
  const bx = Math.max(0, x0 - MARGIN), by = Math.max(0, y0 - MARGIN);
  const bw = Math.min(width, x1 + 1 + MARGIN) - bx, bh = Math.min(height, y1 + 1 + MARGIN) - by;

  // The box as float pixels + its hole
  let img = new Float32Array(bw * bh * 4), msk = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const s = (by + y) * width + bx + x, d = y * bw + x;
    msk[d] = hole[s];
    for (let c = 0; c < 4; c++) img[d * 4 + c] = rgba[s * 4 + c];
  }
  const full = { w: bw, h: bh, img: img.slice(), msk };

  // Too big: work on a shrunk copy and scale the result back up.
  const k = Math.max(1, Math.ceil(Math.max(bw, bh) / MAX_SIDE[style === "smooth" ? "smooth" : "detail"]));
  let w = bw, h = bh;
  if (k > 1) {
    const small = shrink(img, msk, bw, bh, k);
    img = small.img; msk = small.msk; w = small.w; h = small.h;
  }
  const solved = style === "smooth" ? harmonicFill(img, msk, w, h) : teleaFill(img, msk, w, h);
  if (!solved) return false;

  // Back into the picture, hole pixels only
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const d = y * bw + x;
    if (!full.msk[d]) continue;
    const s = (by + y) * width + bx + x;
    for (let c = 0; c < 4; c++) rgba[s * 4 + c] = k > 1 ? sampleBilinear(img, w, h, (x + 0.5) / k - 0.5, (y + 0.5) / k - 0.5, c) : img[d * 4 + c];
  }
  return true;
}

// ---- shared helpers -------------------------------------------------------------------------------

// The picture shrunk by `k`: each new pixel is the average of the known pixels in its block (a hole where none is known).
function shrink(img, msk, w, h, k) {
  const nw = Math.ceil(w / k), nh = Math.ceil(h / k);
  const out = new Float32Array(nw * nh * 4), om = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    let n = 0; const sum = [0, 0, 0, 0];
    for (let yy = y * k; yy < Math.min(h, y * k + k); yy++) for (let xx = x * k; xx < Math.min(w, x * k + k); xx++) {
      const s = yy * w + xx;
      if (msk[s]) continue;
      n++; for (let c = 0; c < 4; c++) sum[c] += img[s * 4 + c];
    }
    const d = y * nw + x;
    if (n) { for (let c = 0; c < 4; c++) out[d * 4 + c] = sum[c] / n; } else om[d] = 1;
  }
  return { img: out, msk: om, w: nw, h: nh };
}

function sampleBilinear(img, w, h, fx, fy, c) {
  const x = Math.max(0, Math.min(w - 1, fx)), y = Math.max(0, Math.min(h - 1, fy));
  const xa = Math.floor(x), ya = Math.floor(y), xb = Math.min(w - 1, xa + 1), yb = Math.min(h - 1, ya + 1);
  const tx = x - xa, ty = y - ya;
  const v = (xx, yy) => img[(yy * w + xx) * 4 + c];
  return (v(xa, ya) * (1 - tx) + v(xb, ya) * tx) * (1 - ty) + (v(xa, yb) * (1 - tx) + v(xb, yb) * tx) * ty;
}

// ---- smooth: a harmonic fill, solved from a coarse picture down ------------------------------------

// Fills `img`'s hole in place. Returns false when there is nothing known to fill from.
export function harmonicFill(img, msk, w, h) {
  let known = 0;
  for (let i = 0; i < w * h; i++) if (!msk[i]) known++;
  if (!known) return false;
  if (Math.max(w, h) <= 40) {
    // small enough to solve outright: start from the mean of the known pixels, then relax
    const mean = [0, 0, 0, 0];
    for (let i = 0; i < w * h; i++) if (!msk[i]) for (let c = 0; c < 4; c++) mean[c] += img[i * 4 + c];
    for (let i = 0; i < w * h; i++) if (msk[i]) for (let c = 0; c < 4; c++) img[i * 4 + c] = mean[c] / known;
    relax(img, msk, w, h, 400);
    return true;
  }
  const coarse = shrink(img, msk, w, h, 2);
  if (!harmonicFill(coarse.img, coarse.msk, coarse.w, coarse.h)) return false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = y * w + x;
    if (!msk[d]) continue;
    for (let c = 0; c < 4; c++) img[d * 4 + c] = sampleBilinear(coarse.img, coarse.w, coarse.h, (x + 0.5) / 2 - 0.5, (y + 0.5) / 2 - 0.5, c);
  }
  relax(img, msk, w, h, 12);
  return true;
}

// Gauss-Seidel sweeps: each hole pixel becomes the average of its neighbours.
function relax(img, msk, w, h, sweeps) {
  for (let s = 0; s < sweeps; s++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = y * w + x;
      if (!msk[d]) continue;
      let n = 0; const sum = [0, 0, 0, 0];
      if (x > 0) { n++; for (let c = 0; c < 4; c++) sum[c] += img[(d - 1) * 4 + c]; }
      if (x < w - 1) { n++; for (let c = 0; c < 4; c++) sum[c] += img[(d + 1) * 4 + c]; }
      if (y > 0) { n++; for (let c = 0; c < 4; c++) sum[c] += img[(d - w) * 4 + c]; }
      if (y < h - 1) { n++; for (let c = 0; c < 4; c++) sum[c] += img[(d + w) * 4 + c]; }
      for (let c = 0; c < 4; c++) img[d * 4 + c] = sum[c] / n;
    }
  }
}

// ---- detail: Telea's fast-marching inpainting -------------------------------------------------------

const KNOWN = 0, BAND = 1, INSIDE = 2;
const RADIUS = 5;
const FAR = 1e6;

export function teleaFill(img, msk, w, h) {
  const n = w * h;
  const flag = new Uint8Array(n), T = new Float32Array(n);
  let known = 0;
  for (let i = 0; i < n; i++) { if (msk[i]) { flag[i] = INSIDE; T[i] = FAR; } else known++; }
  if (!known) return false;

  // A binary min-heap of [T, index].
  const heapT = [], heapI = [];
  const push = (t, i) => {
    let p = heapT.length; heapT.push(t); heapI.push(i);
    while (p > 0) { const q = (p - 1) >> 1; if (heapT[q] <= t) break; heapT[p] = heapT[q]; heapI[p] = heapI[q]; p = q; }
    heapT[p] = t; heapI[p] = i;
  };
  const pop = () => {
    const top = heapI[0], lastT = heapT.pop(), lastI = heapI.pop();
    const size = heapT.length;
    if (size) {
      let p = 0;
      for (;;) {
        let c = 2 * p + 1;
        if (c >= size) break;
        if (c + 1 < size && heapT[c + 1] < heapT[c]) c++;
        if (heapT[c] >= lastT) break;
        heapT[p] = heapT[c]; heapI[p] = heapI[c]; p = c;
      }
      heapT[p] = lastT; heapI[p] = lastI;
    }
    return top;
  };

  // The start: known pixels next to the hole
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (flag[i] === INSIDE) continue;
    if ((x > 0 && flag[i - 1] === INSIDE) || (x < w - 1 && flag[i + 1] === INSIDE) || (y > 0 && flag[i - w] === INSIDE) || (y < h - 1 && flag[i + w] === INSIDE)) {
      flag[i] = BAND; push(0, i);
    }
  }

  // The arrival time at a pixel from two neighbours (the eikonal equation, as in the fast marching method).
  const solve = (i1, i2) => {
    const k1 = i1 >= 0 && flag[i1] === KNOWN, k2 = i2 >= 0 && flag[i2] === KNOWN;
    if (k1 && k2) {
      const t1 = T[i1], t2 = T[i2], d = 2 - (t1 - t2) * (t1 - t2);
      if (d > 0) {
        const r = Math.sqrt(d);
        let s = (t1 + t2 - r) / 2;
        if (s >= t1 && s >= t2) return s;
        s += r;
        if (s >= t1 && s >= t2) return s;
      }
      return FAR;
    }
    if (k1) return 1 + T[i1];
    if (k2) return 1 + T[i2];
    return FAR;
  };
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);

  const tmp = [0, 0, 0, 0];
  const inpaintPixel = (x, y) => {
    const i = y * w + x;
    // The direction the hole's edge arrives from: the gradient of the arrival time.
    const tAt = (xx, yy) => { const j = at(xx, yy); return j >= 0 && flag[j] !== INSIDE ? T[j] : null; };
    const gradT = (xx, yy) => {
      const a = tAt(xx - 1, yy), b = tAt(xx + 1, yy), c = tAt(xx, yy - 1), d = tAt(xx, yy + 1), t0 = T[i];
      const gx = a !== null && b !== null ? (b - a) / 2 : b !== null ? b - t0 : a !== null ? t0 - a : 0;
      const gy = c !== null && d !== null ? (d - c) / 2 : d !== null ? d - t0 : c !== null ? t0 - c : 0;
      return [gx, gy];
    };
    const [gtx, gty] = gradT(x, y);
    tmp[0] = tmp[1] = tmp[2] = tmp[3] = 0;
    let sw = 0;
    for (let qy = y - RADIUS; qy <= y + RADIUS; qy++) for (let qx = x - RADIUS; qx <= x + RADIUS; qx++) {
      const j = at(qx, qy);
      if (j < 0 || flag[j] === INSIDE) continue;
      const rx = x - qx, ry = y - qy, r2 = rx * rx + ry * ry;
      if (r2 > RADIUS * RADIUS || r2 === 0) continue;
      const dist = Math.sqrt(r2);
      let dir = Math.abs(rx * gtx + ry * gty);
      if (dir < 0.01) dir = 1e-6;
      const w8 = dir * (1 / dist) * (1 / (1 + Math.abs(T[i] - T[j])));
      // the known pixel's colour carried to here along its own gradient
      const gl = at(qx - 1, qy), gr = at(qx + 1, qy), gu = at(qx, qy - 1), gd = at(qx, qy + 1);
      for (let c = 0; c < 4; c++) {
        const v = (jj) => img[jj * 4 + c];
        const l = gl >= 0 && flag[gl] !== INSIDE, r = gr >= 0 && flag[gr] !== INSIDE, u = gu >= 0 && flag[gu] !== INSIDE, dn = gd >= 0 && flag[gd] !== INSIDE;
        const gx = l && r ? (v(gr) - v(gl)) / 2 : r ? v(gr) - v(j) : l ? v(j) - v(gl) : 0;
        const gy = u && dn ? (v(gd) - v(gu)) / 2 : dn ? v(gd) - v(j) : u ? v(j) - v(gu) : 0;
        tmp[c] += w8 * (v(j) + gx * rx + gy * ry);
      }
      sw += w8;
    }
    for (let c = 0; c < 4; c++) img[i * 4 + c] = sw > 0 ? Math.max(0, Math.min(255, tmp[c] / sw)) : 0;
  };

  while (heapT.length) {
    const i = pop();
    flag[i] = KNOWN;
    const x = i % w, y = (i - x) / w;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const j = at(nx, ny);
      if (j < 0 || flag[j] === KNOWN) continue;
      if (flag[j] === INSIDE) {
        T[j] = Math.min(solve(at(nx - 1, ny), at(nx, ny - 1)), solve(at(nx + 1, ny), at(nx, ny - 1)), solve(at(nx - 1, ny), at(nx, ny + 1)), solve(at(nx + 1, ny), at(nx, ny + 1)));
        inpaintPixel(nx, ny);
        flag[j] = BAND;
        push(T[j], j);
      }
    }
  }
  return true;
}

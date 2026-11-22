// Filling a hole from its surroundings (render/inpaint.js): the smooth and the detailed style.
import { fillFromSurroundings } from "../apps/ZEditor/src/render/inpaint.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

// A picture, a hole in it, and the true colour there
function make(w, h, f) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y); rgba.set([v[0], v[1], v[2], 255], (y * w + x) * 4); }
  return rgba;
}
function holeAt(w, h, x0, y0, x1, y1) {
  const hole = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) hole[y * w + x] = 1;
  return hole;
}
const px = (rgba, w, x, y) => Array.from(rgba.slice((y * w + x) * 4, (y * w + x) * 4 + 4));
const maxErr = (rgba, truth, w, hole) => { let m = 0; for (let i = 0; i < hole.length; i++) if (hole[i]) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(rgba[i * 4 + c] - truth[i * 4 + c])); return m; };

const W = 120, H = 100;
// 1. a flat colour comes back as that colour (both styles), and nothing outside the hole changes
for (const style of ["smooth", "detail"]) {
  const img = make(W, H, () => [200, 120, 40]);
  const hole = holeAt(W, H, 40, 30, 80, 70);
  for (let i = 0; i < hole.length; i++) if (hole[i]) img.set([0, 0, 0, 255], i * 4); // blanked
  const before = img.slice();
  fillFromSurroundings(img, W, H, hole, style);
  const truth = make(W, H, () => [200, 120, 40]);
  ok(maxErr(img, truth, W, hole) <= 2, style + ": a hole in a flat colour is filled with that colour");
  let outsideSame = true;
  for (let i = 0; i < hole.length; i++) if (!hole[i]) for (let c = 0; c < 4; c++) if (img[i * 4 + c] !== before[i * 4 + c]) outsideSame = false;
  ok(outsideSame, style + ": pixels outside the hole are not touched");
}

// 2. a smooth gradient is carried across the hole
{
  const f = (x) => { const v = Math.round(x * 255 / (W - 1)); return [v, v, v]; };
  const img = make(W, H, f), truth = make(W, H, f);
  const hole = holeAt(W, H, 40, 30, 80, 70);
  for (let i = 0; i < hole.length; i++) if (hole[i]) img.set([0, 0, 0, 255], i * 4);
  fillFromSurroundings(img, W, H, hole, "smooth");
  ok(maxErr(img, truth, W, hole) <= 8, "smooth: a left-to-right gradient continues across the hole (max error " + maxErr(img, truth, W, hole) + ")");
  const img2 = make(W, H, f); for (let i = 0; i < hole.length; i++) if (hole[i]) img2.set([0, 0, 0, 255], i * 4);
  fillFromSurroundings(img2, W, H, hole, "detail");
  ok(maxErr(img2, truth, W, hole) <= 12, "detail: the same gradient (max error " + maxErr(img2, truth, W, hole) + ")");
}

// 3. detail carries a line through the hole; smooth does not (it blends)
{
  const f = (x, y) => (Math.abs(x - 60) <= 1 ? [0, 0, 0] : [255, 255, 255]); // a black vertical line
  const hole = holeAt(W, H, 40, 40, 80, 50); // a short, wide hole across the line
  const mk = () => { const a = make(W, H, f); for (let i = 0; i < hole.length; i++) if (hole[i]) a.set([128, 128, 128, 255], i * 4); return a; };
  const d = mk(); fillFromSurroundings(d, W, H, hole, "detail");
  const s = mk(); fillFromSurroundings(s, W, H, hole, "smooth");
  ok(px(d, W, 60, 45)[0] < 90, "detail: the line still runs through the middle of the hole (value " + px(d, W, 60, 45)[0] + ")");
  ok(px(s, W, 60, 45)[0] > px(d, W, 60, 45)[0], "smooth: blends it away more than detail does (" + px(s, W, 60, 45)[0] + " vs " + px(d, W, 60, 45)[0] + ")");
}

// 4. a hole touching the picture's edge, and a hole with nothing known around it
{
  const img = make(W, H, () => [10, 200, 90]);
  const hole = holeAt(W, H, 0, 0, 30, 30);
  fillFromSurroundings(img, W, H, hole, "detail");
  ok(px(img, W, 5, 5)[1] > 190, "a hole in the corner is filled from the side that has pixels");
  const none = make(10, 10, () => [1, 2, 3]);
  ok(fillFromSurroundings(none, 10, 10, new Uint8Array(100).fill(1), "smooth") === false, "a picture that is all hole is left alone (returns false)");
  ok(fillFromSurroundings(none, 10, 10, new Uint8Array(100), "smooth") === false, "no hole: nothing to do");
}

// 5. a big hole is worked on shrunk and still comes out right
{
  const BW = 1900, BH = 400;
  const img = make(BW, BH, () => [30, 60, 90]);
  const hole = holeAt(BW, BH, 200, 100, 1700, 300);
  for (let i = 0; i < hole.length; i++) if (hole[i]) img.set([255, 0, 0, 255], i * 4);
  const t0 = Date.now();
  fillFromSurroundings(img, BW, BH, hole, "smooth");
  ok(Math.abs(px(img, BW, 900, 200)[0] - 30) <= 3 && Math.abs(px(img, BW, 900, 200)[2] - 90) <= 3, "smooth: a 1500 x 200 hole in a flat picture is filled (" + (Date.now() - t0) + " ms)");
}

console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

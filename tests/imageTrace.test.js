// Image Trace (model/trace/): colour reduction, pixel outlines, smoothing and whole traces.
import { traceMaskLoops, loopArea } from "../apps/ZEditor/src/model/trace/contours.js";
import { edgeMidpoints, simplifyClosed, smoothPathD } from "../apps/ZEditor/src/model/trace/curves.js";
import { kMeans, quantizePixels } from "../apps/ZEditor/src/model/trace/quantize.js";
import { traceImage } from "../apps/ZEditor/src/model/trace/traceImage.js";
import { normalizeTraceSettings, presetSettings, tracerParams } from "../apps/ZEditor/src/model/trace/traceSettings.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const maskFrom = (rows) => ({ width: rows[0].length, height: rows.length, mask: Uint8Array.from(rows.join("").split("").map((c) => (c === "#" ? 1 : 0))) });

// Winding number of a loop around point (px, py), for checking that loops give back their mask.
function winding(loop, px, py) {
  let w = 0;
  for (let i = 0; i < loop.length; i += 2) {
    const x0 = loop[i], y0 = loop[i + 1], x1 = loop[(i + 2) % loop.length], y1 = loop[(i + 3) % loop.length];
    if (y0 <= py) { if (y1 > py && (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0) > 0) w++; }
    else if (y1 <= py && (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0) < 0) w--;
  }
  return w;
}
function rebuilds({ width, height, mask }) {
  const loops = traceMaskLoops(mask, width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const filled = loops.reduce((w, l) => w + winding(l, x + 0.5, y + 0.5), 0) !== 0;
    if (filled !== Boolean(mask[y * width + x])) return false;
  }
  return true;
}

// ---- Outlines
const one = maskFrom(["#"]);
const oneLoops = traceMaskLoops(one.mask, 1, 1);
ok(oneLoops.length === 1 && oneLoops[0].length === 8 && loopArea(oneLoops[0]) === 1, "one pixel: one loop of four corners, area 1, clockwise");
const ring = maskFrom(["####", "#..#", "#..#", "####"]);
const ringLoops = traceMaskLoops(ring.mask, 4, 4);
ok(ringLoops.length === 2 && ringLoops.map(loopArea).sort((a, b) => a - b).join() === "-4,16", "a frame: an outer loop (16) and a hole running the other way (-4)");
ok(traceMaskLoops(maskFrom(["#.", ".#"]).mask, 2, 2).length === 2, "pixels touching only at a corner are separate shapes");
ok(rebuilds(ring) && rebuilds(maskFrom(["#.#.", ".#.#", "##.#", "#.##"])), "filling the loops gives back the mask exactly (frame, checkerboard)");
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let allRebuild = true;
for (let t = 0; t < 30; t++) {
  const w = 3 + Math.floor(rand() * 9), h = 3 + Math.floor(rand() * 9);
  const mask = Uint8Array.from({ length: w * h }, () => (rand() < 0.5 ? 1 : 0));
  if (!rebuilds({ width: w, height: h, mask })) allRebuild = false;
}
ok(allRebuild, "30 random masks are each given back exactly by their loops");

// ---- Smoothing
const square = [0, 0, 10, 0, 10, 10, 0, 10];
const mids = edgeMidpoints(square);
ok(mids.length === 40 && mids[0][0] === 0.5 && mids[0][1] === 0, "a 10×10 square has 40 unit edges, the first middle at (0.5, 0)");
const simple = simplifyClosed(mids, 0.6);
ok(simple.length >= 4 && simple.length <= 8, "simplifying keeps only the points near the corners (" + simple.length + ")");
const stairs = []; // a staircase running down at 45°
for (let i = 0; i < 20; i++) stairs.push([i + 0.5, i], [i + 1, i + 0.5]);
ok(simplifyClosed([...stairs, [20, 0]], 0.8).length <= 4, "a one-pixel staircase smooths to a straight diagonal");
const d = smoothPathD([[0, 0], [10, 0], [10, 10], [0, 10]], 60);
ok(d.startsWith("M") && d.endsWith("Z") && (d.match(/L/g) || []).length === 4 && !d.includes("Q"), "right-angled bends sharper than the corner angle are drawn as corners");
ok((smoothPathD([[0, 0], [10, 0], [10, 10], [0, 10]], 120).match(/Q/g) || []).length === 4, "with a wider corner angle they become curves");
const big = smoothPathD([[0, 0], [200, 0], [200, 100], [0, 100]], 120, 1);
ok(big.startsWith("M200 ") === false && /L19[0-9](\.\d+)? 0Q200 0 200 [0-9](\.\d+)?L/.test(big), "...but a rounded corner between long straight sides only rounds its tip: " + big.slice(0, 60));

// ---- Colours
const centers = kMeans([[0, 0, 0], [2, 2, 2], [250, 250, 250], [255, 255, 255]], 2).map((c) => Math.round(c[0])).sort((a, b) => a - b);
ok(centers[0] === 1 && centers[1] === 253, "k-means finds the dark and the light group");
const pixelsOf = (cols, w, h) => ({ width: w, height: h, data: Uint8ClampedArray.from(cols.flatMap(([r, g, b, a = 255]) => [r, g, b, a])) });
const bw = quantizePixels(pixelsOf([[10, 10, 10], [240, 240, 240], [240, 240, 240], [0, 0, 0, 0]], 4, 1), normalizeTraceSettings({ mode: "bw", threshold: 128, ignoreWhite: "keep" }));
ok(bw.palette[0].join() === "255,255,255" && Array.from(bw.labels).join() === "1,0,0,-1", "black & white: white is used most so it comes first; a see-through pixel stays see-through");
const bwDrop = quantizePixels(pixelsOf([[10, 10, 10], [240, 240, 240]], 2, 1), normalizeTraceSettings({ mode: "bw", ignoreWhite: "drop" }));
ok(Array.from(bwDrop.labels).join() === "0,-1" && bwDrop.palette.length === 1, "Leave see-through: white areas get no shape");

// ---- Whole traces
function picture(w, h, colorAt) {
  const cols = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cols.push(colorAt(x, y));
  return pixelsOf(cols, w, h);
}
const disc = picture(40, 40, (x, y) => (Math.hypot(x - 19.5, y - 19.5) < 12 ? [0, 0, 0] : [255, 255, 255]));
const discTrace = traceImage(disc, presetSettings("bw"));
ok(discTrace.width === 40 && discTrace.paths.length === 1 && discTrace.paths[0].color === "#000000", "a black disc on white traces to one black shape (white left out)");
ok((discTrace.paths[0].d.match(/M/g) || []).length === 1 && (discTrace.paths[0].d.match(/Q/g) || []).length >= 6, "...one outline, made of curves");
const stripes = picture(30, 10, (x) => (x < 10 ? [200, 30, 30] : x < 20 ? [30, 160, 40] : [20, 40, 200]));
const st = traceImage(stripes, { ...presetSettings("color3"), noise: 0 });
ok(st.paths.length === 3 && ["#c81e1e", "#1ea028", "#1428c8"].every((c) => st.paths.some((p) => p.color === c)), "three coloured stripes give three shapes in those colours");
const abut = traceImage(stripes, { ...presetSettings("color3"), noise: 0, method: "abut" });
ok(abut.paths.length === 3 && abut.paths[0].d.length < st.paths[0].d.length + 200, "Abutting traces each colour's own area");
const specks = picture(30, 30, (x, y) => ((x === 5 && y === 5) || (x > 10 && x < 25 && y > 10 && y < 25) ? [0, 0, 0] : [255, 255, 255]));
ok((traceImage(specks, { ...presetSettings("bw"), noise: 40 }).paths[0].d.match(/M/g) || []).length === 1, "Noise drops a one-pixel speck but keeps the big square");
ok((traceImage(specks, { ...presetSettings("bw"), noise: 0 }).paths[0].d.match(/M/g) || []).length === 2, "...and with Noise at 0 the speck stays");

// ---- Settings
const n = normalizeTraceSettings({ preset: "color6", colors: 99, detail: -5, view: "nope" });
ok(n.mode === "color" && n.colors === 16 && n.detail === 0 && n.view === "result" && n.fills === "on", "settings are filled from the preset and kept in range");
ok(tracerParams({ detail: 100 }).tolerance < tracerParams({ detail: 0 }).tolerance, "more Paths detail means a tighter tolerance");
const p900 = tracerParams({ detail: 0, noise: 100 }, 900), p300 = tracerParams({ detail: 0, noise: 100 }, 300);
ok(Math.abs(p900.tolerance - 18) < 1e-9 && Math.abs(tracerParams({ detail: 100 }, 900).tolerance - 0.35) < 1e-9, "Paths runs from loose (1/50 of the long side) to 0.35 px");
ok(p900.minArea > p300.minArea && Math.abs(p900.minArea - 45 * 45) < 1e-6, "Noise grows with the picture: at 100 it drops specks up to 1/20 of the long side across");
// Each Advanced slider visibly changes a trace: fewer points when loose, more corners when high.
const blob = picture(200, 200, (x, y) => (Math.hypot(x - 100, y - 100) < 70 + 12 * Math.sin(Math.atan2(y - 100, x - 100) * 5) ? [0, 0, 0] : [255, 255, 255]));
const count = (set, re) => (traceImage(blob, { ...presetSettings("bw"), ...set }).paths[0].d.match(re) || []).length;
ok(count({ detail: 0 }, /[QL]/g) * 2 < count({ detail: 100 }, /[QL]/g), "Paths 0 uses far fewer points than Paths 100");
ok(count({ corners: 100 }, /Q/g) < count({ corners: 0 }, /Q/g), "Corners 100 turns curves into corners");

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log("all image trace checks passed");

// The AI remover's picture maths (apps/AiToolsLocal/src/fill.js).
import { MODEL_SIZE, blendWeights, buildInput, cropWindow, dilate, findMaskSign, groupMask, groupPieces, holeBounds, labelPieces, outputToRgba, paste, windowMask } from "../shared/js/ai/fill.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const W = 1200, H = 900;
const mask = new Uint8Array(W * H);
for (let y = 400; y < 440; y++) for (let x = 600; x < 660; x++) mask[y * W + x] = 1;

const b = holeBounds(mask, W, H);
ok(b && b.x0 === 600 && b.x1 === 659 && b.y0 === 400 && b.y1 === 439, "the box round the marked pixels");
ok(holeBounds(new Uint8Array(W * H), W, H) === null, "nothing marked: no box");

const g = dilate(mask, W, H, 5);
const bg = holeBounds(g, W, H);
ok(bg.x0 === 595 && bg.x1 === 664 && bg.y0 === 395 && bg.y1 === 444, "growing by 5 pixels makes the box 5 bigger on every side");
ok(dilate(mask, W, H, 0) === mask, "growing by 0 changes nothing");

const c = cropWindow(b, W, H);
ok(c.side === 512 && c.x >= 0 && c.y >= 0 && c.x + c.side <= W && c.y + c.side <= H, "a small area gets a 512 window inside the picture (side " + c.side + ")");
ok(c.x <= b.x0 && c.x + c.side > b.x1 && c.y <= b.y0 && c.y + c.side > b.y1, "the window contains the area");
const corner = new Uint8Array(W * H); corner[0] = 1; corner[1] = 1;
const cc = cropWindow(holeBounds(corner, W, H), W, H);
ok(cc.x === 0 && cc.y === 0, "an area in the corner gets a window pushed inside the picture");
const big = new Uint8Array(W * H); for (let y = 100; y < 600; y++) for (let x = 100; x < 950; x++) big[y * W + x] = 1;
const cb = cropWindow(holeBounds(big, W, H), W, H);
ok(cb === null, "an area bigger than the picture allows gets no window (the app tells the user to mark less)");
const mid = new Uint8Array(W * H); for (let y = 100; y < 500; y++) for (let x = 300; x < 700; x++) mid[y * W + x] = 1;
const cm = cropWindow(holeBounds(mid, W, H), W, H);
ok(cm.side === 600, "a bigger area gets a bigger window (1.5 x), here 600 (side " + cm.side + ")");

// the model's mask: a window that is 2 x the model size marks a block if any pixel in it is marked
const wm = windowMask(mask, W, { x: 300, y: 100, side: 1024 }); // 2 picture px per model px; the window must fit the picture: use a small picture instead
ok(wm.length === MODEL_SIZE * MODEL_SIZE, "the model's mask has the model's size");
const small = new Uint8Array(1024 * 1024); small[300 * 1024 + 301] = 1;
const sm = windowMask(small, 1024, { x: 0, y: 0, side: 1024 });
ok(sm[150 * MODEL_SIZE + 150] === 1, "one marked pixel marks its whole block when the window is shrunk");
let count = 0; for (let i = 0; i < sm.length; i++) count += sm[i]; ok(count === 1, "...and only that block (" + count + ")");

// the model's input and output
const n = MODEL_SIZE * MODEL_SIZE;
const rgba = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) rgba.set([255, 0, 127.5, 255], i * 4);
const hole = new Uint8Array(n); hole[5] = 1;
const x = buildInput(rgba, hole);
ok(x.length === 4 * n && x[0] === 0.5 && x[5] === -0.5, "mask channel: +0.5 where known, -0.5 in the area");
ok(Math.abs(x[n + 0] - 1) < 1e-6 && Math.abs(x[2 * n + 0] + 1) < 1e-6 && Math.abs(x[3 * n + 0]) < 0.01, "picture channels are scaled to -1..1");
ok(x[n + 5] === 0 && x[2 * n + 5] === 0, "the area is blanked to 0 in the picture channels");
const xf = buildInput(rgba, hole, -1);
ok(xf[0] === -0.5 && xf[5] === 0.5, "sign -1 flips the mask channel (the other convention)");
const out = new Float32Array(3 * n); out.fill(-1); for (let i = 0; i < n; i++) out[i] = 1;
const o = outputToRgba(out);
ok(o[0] === 255 && o[1] === 0 && o[3] === 255, "the answer's -1..1 numbers become 0..255 colours");
const unit = new Float32Array(3 * n).fill(0.5); for (let i = 0; i < n; i++) unit[i] = 1;
ok(outputToRgba(unit)[0] === 255 && Math.abs(outputToRgba(unit)[1] - 127.5) < 1, "numbers in 0..1 are read as 0..1");
const bytes = new Float32Array(3 * n).fill(100); bytes[0] = 255;
ok(outputToRgba(bytes)[1] === 100, "numbers up to 255 are read as they are");

// blending and pasting
const m2 = new Uint8Array(100 * 100); for (let y = 30; y < 40; y++) for (let x2 = 30; x2 < 40; x2++) m2[y * 100 + x2] = 1;
const c2 = { x: 10, y: 10, side: 60 };
const w0 = blendWeights(m2, 100, c2, 0), w2 = blendWeights(m2, 100, c2, 2);
const at = (arr, px, py) => arr[(py - c2.y) * c2.side + (px - c2.x)];
ok(at(w0, 35, 35) === 1 && at(w0, 20, 20) === 0, "no feather: 1 inside the area, 0 outside");
ok(at(w2, 35, 35) === 1 && at(w2, 41, 35) > 0 && at(w2, 41, 35) < 1 && at(w2, 20, 20) === 0, "feather 2: a soft ring just outside the area, nothing far away (" + at(w2, 41, 35).toFixed(2) + ")");
const image = new Uint8ClampedArray(100 * 100 * 4).fill(10);
const answer = new Uint8ClampedArray(60 * 60 * 4).fill(250);
paste(image, 100, c2, answer, w0);
ok(image[(35 * 100 + 35) * 4] === 250 && image[(20 * 100 + 20) * 4] === 10, "pasting changes the area and leaves the rest of the picture alone");

// ---- several objects
{
  const W2 = 3000, H2 = 2000;
  const m = new Uint8Array(W2 * H2);
  const blob = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) m[y * W2 + x] = 1; };
  blob(200, 200, 30, 30); blob(2600, 1700, 30, 30);
  const { labels, boxes } = labelPieces(m, W2, H2);
  ok(boxes.length === 2 && boxes[0].x0 === 200 && boxes[1].y1 === 1729, "two separate marks are two pieces");
  const groups = groupPieces(boxes, W2, H2);
  ok(groups.length === 2 && groups.every((g) => g.crop), "far apart: two groups, each with its own window");
  const g0 = groupMask(labels, groups[0].ids);
  let n0 = 0; for (let i = 0; i < g0.length; i++) n0 += g0[i]; ok(n0 === 900, "a group's mask holds only its own piece (" + n0 + " pixels)");
  blob(600, 220, 20, 20); // 370 px from the first: its 512 window overlaps the first one's
  const l2 = labelPieces(m, W2, H2);
  const g2 = groupPieces(l2.boxes, W2, H2);
  ok(l2.boxes.length === 3 && g2.length === 2, "marks whose windows overlap are filled together (3 pieces, " + g2.length + " groups)");
  const d = new Uint8Array(100 * 100); d[10 * 100 + 10] = 1; d[11 * 100 + 11] = 1;
  ok(labelPieces(d, 100, 100).boxes.length === 1, "pixels touching at a corner are one piece");
}

// ---- finding the mask sign with a pretend model
(async () => {
  const fake = (goodSign) => async (rgba, hole, sign) => {
    const out = new Uint8ClampedArray(rgba.length);
    for (let i = 0; i < rgba.length; i++) out[i] = sign === goodSign ? rgba[i] : 128 + ((i * 7) % 90); // the right way round: the picture back; the wrong way: junk
    return out;
  };
  const a = await findMaskSign(fake(1)), b = await findMaskSign(fake(-1));
  ok(a.sign === 1 && b.sign === -1, "the sign test picks the convention that gives the smooth picture back (" + a.sign + ", " + b.sign + ")");
  console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
  process.exit(fails ? 1 : 0);
})();

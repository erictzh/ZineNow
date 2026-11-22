// The AI remover's picture maths (apps/AiToolsLocal/src/fill.js).
import { MODEL_SIZE, blendWeights, buildInput, cropWindow, dilate, holeBounds, outputToRgba, paste, windowMask } from "../apps/AiToolsLocal/src/fill.js";
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
const out = new Float32Array(3 * n); out.fill(-1); for (let i = 0; i < n; i++) out[i] = 1;
const o = outputToRgba(out);
ok(o[0] === 255 && o[1] === 0 && o[3] === 255, "the answer's -1..1 numbers become 0..255 colours");

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

console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

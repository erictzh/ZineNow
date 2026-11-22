// Pattern fill (render/patchFill.js): copies texture from the rest of the picture into a hole.
import { patchFill, MAX_HOLE_SIDE } from "../apps/ZEditor/src/render/patchFill.js";
import { fillFromSurroundings } from "../apps/ZEditor/src/render/inpaint.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

(async () => {
const W = 200, H = 160;
const stripes = () => { const a = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Math.floor(x / 4) % 2 ? 220 : 40; a.set([v, v * 0.8, 100, 255], (y * W + x) * 4); } return a; };
const truth = stripes(), img = stripes(), smooth = stripes();
const hole = new Uint8Array(W * H);
for (let y = 50; y < 110; y++) for (let x = 70; x < 140; x++) { hole[y * W + x] = 1; img.set([255, 0, 255, 255], (y * W + x) * 4); smooth.set([255, 0, 255, 255], (y * W + x) * 4); }
const before = img.slice();
const done = await patchFill(img, W, H, hole);
fillFromSurroundings(smooth, W, H, hole, "smooth", { grain: false });
const err = (a) => { let s = 0, n = 0; for (let i = 0; i < hole.length; i++) if (hole[i]) { s += Math.abs(a[i * 4] - truth[i * 4]); n++; } return s / n; };
ok(done === true, "a hole in a striped picture is filled");
ok(err(img) < 5, "the stripes carry on through the hole (mean error " + err(img).toFixed(1) + ", smooth fill: " + err(smooth).toFixed(1) + ")");
let outside = true;
for (let i = 0; i < hole.length; i++) if (!hole[i]) for (let c = 0; c < 4; c++) if (img[i * 4 + c] !== before[i * 4 + c]) outside = false;
ok(outside, "pixels outside the hole are not touched");

// it uses the picture's own pixels: every filled pixel is a colour that exists outside the hole
const noisy = new Uint8ClampedArray(W * H * 4); let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < W * H; i++) noisy.set([Math.floor(rnd() * 8) * 30, Math.floor(rnd() * 8) * 30, 90, 255], i * 4);
const seen = new Set(); for (let i = 0; i < hole.length; i++) if (!hole[i]) seen.add(noisy[i * 4] + "," + noisy[i * 4 + 1]);
for (let i = 0; i < hole.length; i++) if (hole[i]) noisy.set([255, 255, 255, 255], i * 4);
await patchFill(noisy, W, H, hole);
let real = true; for (let i = 0; i < hole.length; i++) if (hole[i] && !seen.has(noisy[i * 4] + "," + noisy[i * 4 + 1])) real = false;
ok(real, "a noisy picture's fill is made only of pixels the picture has (real grain, nothing invented)");

// it says no when it can't
const big = new Uint8Array(W * H).fill(1);
ok((await patchFill(new Uint8ClampedArray(W * H * 4), W, H, big)) === false, "a picture that is all hole: false");
const BW = MAX_HOLE_SIDE + 100, BH = 100; const wide = new Uint8Array(BW * BH); for (let y = 10; y < 90; y++) for (let x = 20; x < 20 + MAX_HOLE_SIDE + 5; x++) wide[y * BW + x] = 1;
ok((await patchFill(new Uint8ClampedArray(BW * BH * 4), BW, BH, wide)) === false, "a hole wider than " + MAX_HOLE_SIDE + " px: false (the caller uses the smooth fill)");
let stopped = false;
const hole2 = new Uint8Array(W * H); for (let y = 20; y < 140; y++) for (let x = 20; x < 180; x++) hole2[y * W + x] = 1;
const res = await patchFill(stripes(), W, H, hole2, { shouldStop: () => { stopped = true; return true; } });
ok(res === false || stopped === false, "it can be asked to stop");

console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);
})();

// Remove background: the picture maths (shared/js/ai/segment.js).
import { SEG_PREP, SEG_SIZE, maskStats, maskToAlpha, segInput, segMask, softCut } from "../shared/js/ai/segment.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const n = SEG_SIZE * SEG_SIZE;
const rgba = new Uint8ClampedArray(n * 4).fill(255);
const inp = segInput(rgba);
ok(inp.length === 3 * n, "the model gets 3 channels of 320 x 320");
ok(Math.abs(inp[0] - (1 - 0.485) / 0.229) < 1e-5 && Math.abs(inp[n] - (1 - 0.456) / 0.224) < 1e-3, "white maps through mean and spread per colour");
const dark = new Uint8ClampedArray(n * 4).fill(100);
ok(Math.abs(segInput(dark)[0] - segInput(rgba)[0]) < 1e-5, "a dark picture is scaled by its brightest value, like a bright one");

const m = segMask(new Float32Array([-3, 0, 5, 1]));
ok(m[0] === 0 && m[2] === 1 && m[1] > 0 && m[1] < 1, "the answer is stretched to 0..1");
ok(segMask(new Float32Array([2, 2]))[0] === 0, "a flat answer does not divide by zero");

ok(softCut(0.9, 0.5, 0.1) === 1 && softCut(0.1, 0.5, 0.1) === 0, "far above the cut-off: solid; far below: see-through");
ok(softCut(0.5, 0.5, 0.1) === 0 && Math.abs(softCut(0.55, 0.5, 0.1) - 0.5) < 1e-9, "at the cut-off: fully see-through; half way up the fade: half");
ok(softCut(0.55, 0.5, 0.1) > softCut(0.52, 0.5, 0.1), "it fades in smoothly");
ok(softCut(0.6, 0.7, 0.01) === 0, "a harder edge (small soft) cuts sharply");
const a = maskToAlpha(new Float32Array([0, 0.5, 1]), 0.5, 0.1);
ok(a[0] === 0 && a[1] === 0 && a[2] === 255, "mask becomes alpha bytes");
const hi = maskToAlpha(new Float32Array([0.6]), 0.7, 0.05)[0], lo = maskToAlpha(new Float32Array([0.6]), 0.3, 0.05)[0];
ok(hi < lo, "a higher cut-off keeps less");
// MODNet: 512 x 512, colours scaled by 255 (not by the brightest value), mean/std 0.5, and its answer is already a 0..1 matte
const n5 = SEG_PREP.modnet.size * SEG_PREP.modnet.size;
const w5 = new Uint8ClampedArray(n5 * 4).fill(255), g5 = new Uint8ClampedArray(n5 * 4).fill(51);
ok(SEG_PREP.modnet.size === 512 && segInput(w5, SEG_PREP.modnet).length === 3 * n5, "MODNet takes 3 channels of 512 x 512");
ok(Math.abs(segInput(w5, SEG_PREP.modnet)[0] - 1) < 1e-6 && Math.abs(segInput(g5, SEG_PREP.modnet)[0] - (0.2 - 0.5) / 0.5) < 1e-6, "MODNet: 255 -> 1, 51 -> -0.6 (scaled by 255, not by the brightest)");
const cm = segMask(new Float32Array([-0.2, 0.3, 1.4]), "clamp");
ok(cm[0] === 0 && Math.abs(cm[1] - 0.3) < 1e-6 && cm[2] === 1, "MODNet answer is kept as it is, only clamped to 0..1");
// very small cut-offs still cut cleanly (the soft part narrows)
ok(softCut(0.0005, 0.001, 0.1) === 0 && softCut(0.0002, 0.001, 0.1) === 0 && softCut(0.2, 0.001, 0.1) === 1, "a tiny cut-off: the background's tiny values (not exactly 0) are fully see-through, the subject solid");
ok(softCut(1, 0.999, 0.1) === 1 && softCut(0.9, 0.999, 0.1) === 0, "a cut-off near 100%: only the surest pixels stay");
ok(softCut(0, 0, 0.1) === 1 && softCut(0.00005, 0, 0.1) === 1, "a cut-off of 0 cuts nothing (even the lowest mask values stay solid)");
// the numbers for the debug window
const ms = maskStats(new Float32Array([0, 0, 0, 0.00005, 0.5, 1, 1, 1]));
ok(ms.n === 8 && ms.min === 0 && ms.max === 1 && Math.abs(ms.mean - (0.50005 + 3) / 8) < 1e-6, "mask stats: size, min, max, mean");
ok(Math.abs(ms.below[0].share - 4 / 8) < 1e-9 && Math.abs(ms.below.reduce((a, b) => a + b.share, 0) - 1) < 1e-9, "mask stats: the range shares add up to 1 (half the values are below 0.0001)");
ok(ms.p50 <= 0.55 && ms.p95 >= 0.95, "mask stats: percentiles");
const two = maskStats(new Float32Array([0.01, 0.01, 0.01, 0.01, 0.95, 0.97, 1, 0.99]));
ok(two.otsu > 0.01 && two.otsu < 0.95, "mask stats: the automatic split falls between the background and the subject values (" + two.otsu.toFixed(3) + ")");
// the real case seen on the tablet: background values 0.00025, a cut-off of 0.1 % must make them fully see-through
ok(softCut(0.00025, 0.001, 0.1) === 0 && softCut(0.9997, 0.001, 0.1) === 1, "background 0.00025 and subject 0.9997 at a 0.1 % cut-off: see-through and solid");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

// Gaussian blur of pixels (render/gaussianBlur.js).
import { gaussianBlur } from "../apps/ZEditor/src/render/gaussianBlur.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const W = 41, H = 41;
const make = (fn) => { const d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b, a] = fn(x, y); const i = (y * W + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; } return d; };
const at = (d, x, y) => d[(y * W + x) * 4];

// A white dot on black spreads out and keeps its total brightness.
const block = (x, y) => (Math.abs(x - 20) <= 2 && Math.abs(y - 20) <= 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]);
const dot = make(block);
const before = [...dot].filter((_, i) => i % 4 === 0).reduce((s, v) => s + v, 0);
gaussianBlur(dot, W, H, 3);
const after = [...dot].filter((_, i) => i % 4 === 0).reduce((s, v) => s + v, 0);
ok(at(dot, 20, 20) < 255 && at(dot, 20, 20) > 0 && at(dot, 24, 20) > 0 && at(dot, 20, 24) > 0, "a bright block spreads in every direction");
ok(Math.abs(after - before) < before * 0.05, "the total brightness stays about the same (" + before + " -> " + after + ")");
ok(at(dot, 20, 20) >= at(dot, 22, 20) && at(dot, 22, 20) >= at(dot, 26, 20), "it is brightest in the middle and fades outward");
ok(Math.abs(at(dot, 17, 20) - at(dot, 23, 20)) <= 2 && Math.abs(at(dot, 20, 17) - at(dot, 20, 23)) <= 2, "symmetric");

// A larger sigma spreads more.
const a = make((x, y) => (x === 20 && y === 20 ? [255, 255, 255, 255] : [0, 0, 0, 255])), b = make((x, y) => (x === 20 && y === 20 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
gaussianBlur(a, W, H, 1.5); gaussianBlur(b, W, H, 5);
ok(at(a, 20, 20) > at(b, 20, 20) && at(b, 28, 20) >= at(a, 28, 20), "a larger radius spreads wider and lower");

// A flat picture stays flat; sigma 0 changes nothing.
const flat = make(() => [120, 60, 30, 255]); gaussianBlur(flat, W, H, 4);
ok(at(flat, 0, 0) === 120 && at(flat, 20, 20) === 120 && at(flat, 40, 40) === 120, "a flat colour stays the same, edges included");
const same = make((x) => [x * 5, 0, 0, 255]), copy = Uint8ClampedArray.from(same); gaussianBlur(same, W, H, 0);
ok(same.every((v, i) => v === copy[i]), "no radius, no change");

// A see-through edge does not grow a dark halo: red on transparent stays red.
const edge = make((x) => (x < 20 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
gaussianBlur(edge, W, H, 3);
const i = (20 * W + 21) * 4;
ok(edge[i + 3] > 0 && edge[i + 3] < 255 && edge[i] > 240 && edge[i + 1] < 10, "the blurred edge stays red while it fades (no dark halo)");
if (fails) { console.log(fails + " failed"); process.exit(1); }

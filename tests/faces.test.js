// Face blur: YuNet's picture maths (shared/js/ai/faces.js).
import { FACE_SIZE, decodeYunet, nms, paddedBox, yunetInput } from "../shared/js/ai/faces.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

// input: B, G, R planes, 0..255 (not scaled)
const rgba = new Uint8ClampedArray(4 * 4); rgba.set([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]);
const inp = yunetInput(rgba, 2, 2);
ok(inp.length === 12 && inp[0] === 30 && inp[4] === 20 && inp[8] === 10 && inp[3] === 120, "the input is blue, green, red planes with the raw 0..255 values");

// a model answer with one planted face at stride 16, cell row 10, col 12 (the same one the benchmark page's stub model has)
const W = FACE_SIZE, H = FACE_SIZE, out = {};
for (const s of [8, 16, 32]) { const n = (W / s) * (H / s); out["cls_" + s] = new Float32Array(n); out["obj_" + s] = new Float32Array(n); out["bbox_" + s] = new Float32Array(n * 4); }
const i = 10 * (W / 16) + 12;
out.cls_16[i] = 0.9; out.obj_16[i] = 0.9; out.bbox_16.set([0.5, 0.5, Math.log(5), Math.log(6)], i * 4);
const get = (p, s) => out[p + "_" + s] || null;
const faces = decodeYunet(get, W, H, 1, 0.5);
ok(faces.length === 1 && Math.abs(faces[0].x - 160) < 1e-3 && Math.abs(faces[0].y - 120) < 1e-3 && Math.abs(faces[0].w - 80) < 1e-3 && Math.abs(faces[0].h - 96) < 1e-3 && Math.abs(faces[0].score - 0.9) < 1e-6, "the planted face is decoded to its box and score");
const scaled = decodeYunet(get, W, H, 0.5, 0.5);
ok(Math.abs(scaled[0].x - 320) < 1e-3 && Math.abs(scaled[0].w - 160) < 1e-3, "boxes are returned in picture pixels (the picture was shrunk to half to fit)");
ok(decodeYunet(get, W, H, 1, 0.95).length === 0, "a minimum score above the face's score finds nothing");
let threw = false; try { decodeYunet(() => null, W, H, 1, 0.5); } catch (e) { threw = true; }
ok(threw, "missing outputs give a clear error");

const dup = nms([{ x: 0, y: 0, w: 100, h: 100, score: 0.8 }, { x: 5, y: 5, w: 100, h: 100, score: 0.9 }, { x: 300, y: 300, w: 50, h: 50, score: 0.7 }], 0.3);
ok(dup.length === 2 && dup[0].score === 0.9, "overlapping boxes are merged (the best one is kept), a separate one stays");

const pb = paddedBox({ x: 100, y: 100, w: 50, h: 60 }, 20, 400, 300);
ok(pb.x === 90 && pb.y === 88 && pb.w === 70 && pb.h === 84, "a box grows by the given percent of its size on each side");
const edge = paddedBox({ x: 5, y: 5, w: 50, h: 50 }, 50, 100, 100);
ok(edge.x === 0 && edge.y === 0 && edge.x + edge.w <= 100 && edge.y + edge.h <= 100, "a grown box stays inside the picture");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

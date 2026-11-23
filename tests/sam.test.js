// Click-to-select: MobileSAM's picture maths (shared/js/ai/sam.js).
import { SAM_SIZE, pickMask, samDims, samInput, samPoints } from "../shared/js/ai/sam.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const d = samDims(1280, 960);
ok(d.w === 1024 && d.h === 768 && Math.abs(d.k - 0.8) < 1e-9, "the picture is shrunk so its long side is 1024 (1280x960 -> 1024x768, k 0.8)");
const t = samDims(500, 2000);
ok(t.h === SAM_SIZE && t.w === 256, "a tall picture: the height becomes 1024");
const small = samDims(100, 50);
ok(small.w === 1024 && small.h === 512, "a small picture is enlarged to 1024 on its long side");

const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
const inp = samInput(rgba, 2, 1);
ok(inp.length === 6 && inp[0] === 10 && inp[1] === 20 && inp[2] === 30 && inp[3] === 40 && inp[5] === 60, "the reader's input is height x width x 3 with the raw 0..255 colours (red, green, blue per pixel)");

const pts = samPoints([{ x: 100, y: 50, label: 1 }, { x: 10, y: 20, label: 0 }], 0.8);
ok(pts.n === 3 && pts.coords[0] === 80 && pts.coords[1] === 40 && pts.coords[2] === 8 && pts.coords[3] === 16, "clicks are scaled by the reader's factor");
ok(pts.labels[0] === 1 && pts.labels[1] === 0 && pts.labels[2] === -1 && pts.coords[4] === 0 && pts.coords[5] === 0, "add = 1, take away = 0, plus the (0,0) padding point labelled -1");

const masks = new Float32Array([-1, 2, -3, 4, /* channel 2 */ 5, 6, -7, -8]);
const one = pickMask(masks.subarray(0, 4), [1, 1, 2, 2], null);
ok(one.w === 2 && one.h === 2 && one.mask.join("") === "0101" && Math.abs(one.coverage - 0.5) < 1e-9, "one mask: values above 0 are selected");
const two = pickMask(masks, [1, 2, 2, 2], [0.4, 0.9]);
ok(two.best === 1 && two.mask.join("") === "1100", "with several masks the best-scoring one is used");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

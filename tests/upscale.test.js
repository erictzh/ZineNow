// Upscale: the tiling maths (shared/js/ai/upscale.js), checked with a pretend model that just makes every pixel 4 times bigger.
import { resultSize, tileInput, tilePlan, tileToRgba } from "../shared/js/ai/upscale.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const plan = tilePlan(37, 23, 16);
ok(plan.length === 6 && plan[0].w === 16 && plan[2].w === 5 && plan[3].h === 7 && plan.reduce((a, t) => a + t.w * t.h, 0) === 37 * 23, "tiles cover the picture exactly (edge tiles are smaller)");

// a pretend picture with a different colour in every pixel
const W = 37, H = 23, rgba = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) { rgba[i * 4] = (i * 7) % 256; rgba[i * 4 + 1] = (i * 13) % 256; rgba[i * 4 + 2] = (i * 29) % 256; rgba[i * 4 + 3] = 255; }
const inp = tileInput(rgba, W, H, -3, -3, 8);
ok(inp.length === 3 * 64 && Math.abs(inp[0] - rgba[0] / 255) < 1e-6 && Math.abs(inp[3 * 8 + 3] - rgba[0] / 255) < 1e-6 && Math.abs(inp[8 * 8 + 0] - rgba[1] / 255) < 1e-6, "outside the picture the nearest edge pixel is copied (and the planes are red, green, blue)");

const S = 4, pad = 4, tile = 16, T = tile + 2 * pad, out = new Uint8ClampedArray(W * S * H * S * 4);
for (const t of plan) {
  const x = tileInput(rgba, W, H, t.x0 - pad, t.y0 - pad, T);
  // the pretend model: every pixel becomes S x S pixels
  const OT = T * S, od = new Float32Array(3 * OT * OT);
  for (let c = 0; c < 3; c++) for (let y = 0; y < OT; y++) for (let xx = 0; xx < OT; xx++) od[c * OT * OT + y * OT + xx] = x[c * T * T + Math.floor(y / S) * T + Math.floor(xx / S)];
  const piece = tileToRgba(od, OT, S, pad, t.w, t.h);
  for (let y = 0; y < t.h * S; y++) for (let xx = 0; xx < t.w * S; xx++) { const di = ((t.y0 * S + y) * W * S + t.x0 * S + xx) * 4, si = (y * t.w * S + xx) * 4; for (let c = 0; c < 4; c++) out[di + c] = piece[si + c]; }
}
let bad = 0;
for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) { const o = (y * W * S + x) * 4, s = (Math.floor(y / S) * W + Math.floor(x / S)) * 4; for (let c = 0; c < 3; c++) if (Math.abs(out[o + c] - rgba[s + c]) > 1) bad++; if (out[o + 3] !== 255) bad++; }
ok(bad === 0, "the tiles join into exactly the enlarged picture (no seams, edges right): " + bad + " wrong values");

const r = resultSize(2000, 1500, 4, 8192);
ok(r.w === 8000 && r.h === 6000 && !r.tooBig && resultSize(2100, 1000, 4, 8192).tooBig, "the result size, and the longest-side limit");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

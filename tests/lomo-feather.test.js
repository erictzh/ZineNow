// The Lomo look (render/lomo.js) and Feather (render/feather.js): the pixel maths.
import { lomoPixels } from "../apps/ZEditor/src/render/lomo.js";
import { distanceToOutside, featherAlpha } from "../apps/ZEditor/src/render/feather.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const flat = (w, h, v) => { const a = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) a.set([v[0], v[1], v[2], 255], i * 4); return a; };
const at = (a, w, x, y) => Array.from(a.slice((y * w + x) * 4, (y * w + x) * 4 + 3));
const base = { strength: 100, contrast: 0, saturation: 0, tintAmount: 0, shadowTint: [14, 90, 115], highlightTint: [255, 179, 92], vignette: 0, vignetteSize: 50, vignetteRound: 50, grain: 0 };

// ---- Lomo
{
  const W = 60, H = 40;
  const a = flat(W, H, [120, 130, 140]); const before = a.slice();
  lomoPixels(a, W, H, { ...base, strength: 0, vignette: 100, contrast: 100, tintAmount: 100 });
  ok(a.every((v, i) => v === before[i]), "strength 0 leaves the picture as it is");

  const v = flat(W, H, [160, 160, 160]);
  lomoPixels(v, W, H, { ...base, vignette: 80, vignetteSize: 60 });
  ok(at(v, W, 30, 20)[0] === 160, "vignette: the middle is untouched");
  ok(at(v, W, 0, 0)[0] < 100, "vignette: a corner is much darker (" + at(v, W, 0, 0)[0] + ")");
  ok(at(v, W, 0, 0)[0] < at(v, W, 15, 10)[0] && at(v, W, 15, 10)[0] <= 160, "vignette: darker the further out it goes");

  const none = flat(W, H, [160, 160, 160]);
  lomoPixels(none, W, H, { ...base, vignette: 0 });
  ok(none.every((x, i) => x === 160 || i % 4 === 3), "no vignette, nothing else on: nothing changes");

  const dark = flat(W, H, [40, 40, 40]), light = flat(W, H, [220, 220, 220]);
  lomoPixels(dark, W, H, { ...base, tintAmount: 100 }); lomoPixels(light, W, H, { ...base, tintAmount: 100 });
  ok(at(dark, W, 5, 5)[2] > at(dark, W, 5, 5)[0], "shadows lean to the shadow colour (blue > red in the teal)");
  ok(at(light, W, 5, 5)[0] > at(light, W, 5, 5)[2], "highlights lean to the highlight colour (red > blue in the warm orange)");

  const lo = flat(W, H, [100, 100, 100]), hi = flat(W, H, [160, 160, 160]);
  lomoPixels(lo, W, H, { ...base, contrast: 100 }); lomoPixels(hi, W, H, { ...base, contrast: 100 });
  ok(at(lo, W, 5, 5)[0] < 100 && at(hi, W, 5, 5)[0] > 160, "contrast pushes darks darker and lights lighter");

  const g1 = flat(W, H, [128, 128, 128]), g2 = flat(W, H, [128, 128, 128]);
  lomoPixels(g1, W, H, { ...base, grain: 60 }); lomoPixels(g2, W, H, { ...base, grain: 60 });
  ok(g1.every((x, i) => x === g2[i]), "grain is the same every time (repeatable)");
  let varied = false; for (let i = 4; i < g1.length; i += 4) if (g1[i] !== g1[0]) varied = true;
  ok(varied, "grain makes the flat grey noisy");

  const s = flat(W, H, [200, 80, 60]); lomoPixels(s, W, H, { ...base, saturation: 100 });
  ok(at(s, W, 5, 5)[0] > 200 || at(s, W, 5, 5)[2] < 60, "saturation boost makes colours stronger");
}

// ---- Feather
{
  const W = 100, H = 60;
  const all = featherAlpha(W, H, 20, "linear", "all", null);
  ok(all[30 * W + 50] === 1, "the middle of the image stays solid");
  ok(all[0] < 0.1, "a corner pixel is nearly see-through (" + all[0].toFixed(2) + ")");
  ok(all[30 * W + 0] < 0.1 && all[30 * W + 99] < 0.1 && all[0 * W + 50] < 0.1 && all[59 * W + 50] < 0.1, "all four edges are nearly see-through");
  ok(Math.abs(all[30 * W + 10] - 0.525) < 0.06, "linear: half way into the fade is about half (" + all[30 * W + 10].toFixed(2) + ")");
  const smooth = featherAlpha(W, H, 20, "smooth", "all", null);
  ok(smooth[30 * W + 5] < all[30 * W + 5], "smooth starts slower than linear");
  const top = featherAlpha(W, H, 20, "linear", "top", null);
  ok(top[0 * W + 50] < 0.1 && top[59 * W + 50] === 1 && top[30 * W + 0] === 1, "top only: just the top edge fades");
  const lr = featherAlpha(W, H, 20, "linear", "lr", null);
  ok(lr[30 * W + 0] < 0.1 && lr[0 * W + 50] === 1, "left and right: the sides fade, the top does not");
  ok(featherAlpha(W, H, 29, "linear", "all", null)[30 * W + 50] > 0.99, "the widest feather (half the short side) just reaches full in the very middle");

  // a round shape: a circle of radius 25 in a 60 x 60 picture
  const N = 60, circle = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) circle[y * N + x] = Math.hypot(x + 0.5 - 30, y + 0.5 - 30) <= 25 ? 1 : 0;
  const c = featherAlpha(N, N, 10, "linear", "all", circle);
  ok(c[30 * N + 30] === 1, "a round shape: the middle is solid");
  ok(c[0] === 0 && c[5 * N + 5] === 0, "a round shape: outside it is see-through");
  ok(c[30 * N + 6] > 0 && c[30 * N + 6] < 0.3, "a round shape: it fades in from its own edge (" + c[30 * N + 6].toFixed(2) + ")");
  const d = distanceToOutside(circle, N, N);
  ok(Math.abs(d[30 * N + 30] - 25) < 2, "the distance to the edge at the middle is about the radius (" + d[30 * N + 30].toFixed(1) + ")");
}

console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

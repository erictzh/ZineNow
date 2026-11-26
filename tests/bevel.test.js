// Bevel and Emboss shading (render/bevel.js).
import { bevelPixels } from "../apps/ZEditor/src/render/bevel.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const W = 100, H = 100;
const box = new Uint8ClampedArray(W * H); // a 40 x 40 square in the middle
for (let y = 30; y < 70; y++) for (let x = 30; x < 70; x++) box[y * W + x] = 255;
const hi = { r: 255, g: 255, b: 255, a: 1 }, sh = { r: 0, g: 0, b: 0, a: 1 };
const base = { sigma: 4, depth: 100, lightDeg: 315, raised: true, insideOnly: true, highlight: hi, shadow: sh };
const at = (px, x, y) => { const i = (y * W + x) * 4; return { r: px[i], a: px[i + 3] }; };

const out = bevelPixels(box, W, H, base);
const topLeft = at(out, 32, 50), bottomRight = at(out, 67, 50), topEdge = at(out, 50, 31), bottomEdge = at(out, 50, 68);
ok(topEdge.a > 30 && topEdge.r === 255, "with the light from the top left, the top edge is highlighted");
ok(bottomEdge.a > 30 && bottomEdge.r === 0, "...and the bottom edge is in shadow");
ok(topLeft.r === 255 && bottomRight.r === 0, "the left edge is lit and the right edge dark (light from the top left)");
ok(at(out, 50, 50).a === 0, "the flat middle gets nothing");
ok(at(out, 10, 10).a === 0 && at(out, 29, 50).a === 0, "a bevel stays on the shape: nothing outside it");

const pressed = bevelPixels(box, W, H, { ...base, raised: false });
ok(at(pressed, 50, 31).r === 0 && at(pressed, 50, 68).r === 255, "pressed in flips the light and the shadow");

const emb = bevelPixels(box, W, H, { ...base, insideOnly: false, sigma: 6 });
ok(at(emb, 50, 27).a > 0 || at(emb, 50, 26).a > 0, "an emboss spills past the edge");
ok(at(emb, 50, 50).a === 0, "...but the flat middle is still untouched");

const weak = bevelPixels(box, W, H, { ...base, depth: 20 });
ok(at(weak, 50, 31).a < at(out, 50, 31).a, "less depth, a weaker edge");
const light = bevelPixels(box, W, H, { ...base, lightDeg: 0 });
ok(at(light, 50, 31).r === 255 && at(light, 31, 50).a < at(light, 50, 31).a, "light from the top lights the top edge most");
const none = bevelPixels(box, W, H, { ...base, highlight: { ...hi, a: 0 }, shadow: { ...sh, a: 0 } });
ok(none.every((v, i) => i % 4 !== 3 || v === 0), "zero strength draws nothing");
// Hardness: a mid-slope pixel is much stronger on a hard bevel than on a soft one; soften spreads without leaving the shape.
const softB = bevelPixels(box, W, H, { ...base, depth: 40, hardness: 0 }), hardB = bevelPixels(box, W, H, { ...base, depth: 40, hardness: 100 });
ok(at(hardB, 50, 33).a > at(softB, 50, 33).a, "a hard bevel reaches full strength sooner than a soft one");
const crisp = bevelPixels(box, W, H, { ...base, hardness: 100, soften: 0 }), blurred = bevelPixels(box, W, H, { ...base, hardness: 100, soften: 3 });
const spread = (px) => { let n = 0; for (let x = 28; x < 50; x++) if (at(px, x, 50).a > 5) n++; return n; };
ok(spread(blurred) >= spread(crisp) && at(blurred, 20, 50).a === 0 && at(blurred, 29, 50).a === 0, "soften blurs the edge but a bevel stays on the shape");
if (fails) { console.log(fails + " failed"); process.exit(1); }

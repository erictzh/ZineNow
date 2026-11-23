// "Try another" for the AI fill: a fixed cycle of slightly different views (apps/ZEditor/src/render/aiFill.js).
import { AI_VARIATIONS, variationFor, varyCrop } from "../apps/ZEditor/src/render/aiFill.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(variationFor(0).grow === 0 && variationFor(0).dx === 0 && variationFor(0).scale === 1, "variation 0 is the normal fill");
ok(variationFor(AI_VARIATIONS.length) === variationFor(0), "the cycle repeats");
ok(variationFor(3) === variationFor(3) && variationFor(2) !== variationFor(3), "press N always gives the same variation");
ok(AI_VARIATIONS.every((v) => v.grow >= 0), "the area is only ever grown, never shrunk");

const W = 1200, H = 900, bounds = { x0: 560, y0: 400, x1: 659, y1: 479 };
const crop = { x: 400, y: 200, side: 512 };
for (let i = 0; i < AI_VARIATIONS.length; i++) {
  const c = varyCrop(crop, variationFor(i), bounds, W, H);
  const inside = c.x >= 0 && c.y >= 0 && c.x + c.side <= W && c.y + c.side <= H;
  const covers = c.x <= bounds.x0 && c.y <= bounds.y0 && c.x + c.side >= bounds.x1 + 1 && c.y + c.side >= bounds.y1 + 1;
  ok(inside && covers, "variation " + i + ": window stays in the picture and covers the marked area");
}
ok(JSON.stringify(varyCrop(crop, variationFor(1), bounds, W, H)) !== JSON.stringify(crop), "a later variation really moves the window");
// an area at the picture's corner still fits
const corner = { x0: 0, y0: 0, x1: 40, y1: 40 };
const c2 = varyCrop({ x: 0, y: 0, side: 512 }, variationFor(1), corner, W, H);
ok(c2.x === 0 && c2.y === 0 && c2.side === 512, "at the picture's corner the window cannot leave the picture");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

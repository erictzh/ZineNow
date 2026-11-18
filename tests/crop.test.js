// Resizing the crop window by its handles (model/crop.js).
import { resizedCrop } from "../apps/ZEditor/src/model/crop.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const is = (c, x, y, w, h) => near(c.x, x) && near(c.y, y) && near(c.w, w) && near(c.h, h);
const inside = (c, W, H) => c.x >= -1e-9 && c.y >= -1e-9 && c.x + c.w <= W + 1e-9 && c.y + c.h <= H + 1e-9;

const W = 400, H = 300;
const crop = { x: 100, y: 80, w: 200, h: 100 }; // ratio 2:1

// Free resizing: each side moves alone
ok(is(resizedCrop(crop, W, H, "e", 30, 99, false), 100, 80, 230, 100), "the east handle changes only the width");
ok(is(resizedCrop(crop, W, H, "w", -40, 99, false), 60, 80, 240, 100), "the west handle moves the left edge");
ok(is(resizedCrop(crop, W, H, "n", 99, -20, false), 100, 60, 200, 120), "the north handle changes only the height, upward");
ok(is(resizedCrop(crop, W, H, "s", 99, 25, false), 100, 80, 200, 125), "the south handle changes only the height, downward");
ok(is(resizedCrop(crop, W, H, "nw", -10, -10, false), 90, 70, 210, 110), "a corner moves two edges, free of the ratio");
ok(is(resizedCrop(crop, W, H, "se", 500, 500, false), 100, 80, 300, 220), "a window can't grow past the image");
ok(is(resizedCrop(crop, W, H, "w", -500, 0, false), 0, 80, 300, 100), "...on any side");
ok(is(resizedCrop(crop, W, H, "e", -500, 0, false), 100, 80, 20, 100), "a window can't shrink below the minimum size");
ok(is(resizedCrop(crop, W, H, "n", 0, 500, false), 100, 160, 200, 20), "...the other way too");

// Shift: the ratio stays
const ratio = (c) => c.w / c.h;
for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
  const c = resizedCrop(crop, W, H, handle, 37, -23, true);
  ok(near(ratio(c), 2) && inside(c, W, H), `Shift on ${handle} keeps the 2:1 ratio inside the image`);
}
ok(is(resizedCrop(crop, W, H, "se", 40, 0, true), 100, 80, 240, 120), "a corner follows the axis the pointer went furthest along");
ok(is(resizedCrop(crop, W, H, "se", 0, 40, true), 100, 80, 280, 140), "...either axis");
ok(is(resizedCrop(crop, W, H, "nw", -20, 0, true), 80, 70, 220, 110), "the opposite corner stays put");
const east = resizedCrop(crop, W, H, "e", 40, 0, true);
ok(is(east, 100, 70, 240, 120), "a side handle grows the other axis evenly about its middle");
const north = resizedCrop(crop, W, H, "n", 0, -20, true);
ok(is(north, 80, 60, 240, 120), "...the north handle widens evenly about the middle");
const capped = resizedCrop(crop, W, H, "e", 900, 0, true);
ok(inside(capped, W, H) && near(ratio(capped), 2) && near(capped.x, 100), "growing as far as it can stops at the image edge, still 2:1");
const tiny = resizedCrop(crop, W, H, "se", -900, -900, true);
ok(near(Math.min(tiny.w, tiny.h), 20) && near(ratio(tiny), 2), "shrinking stops at the minimum, still 2:1");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

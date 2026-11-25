// Page layouts (apps/ZEditor/src/model/pageLayouts.js): the geometry of every layout, from one set of settings.
import { DEFAULT_LAYOUT_SETTINGS, LAYOUTS, innerBox, layoutByKey, normalizeLayoutSettings, place } from "../apps/ZEditor/src/model/pageLayouts.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const S = DEFAULT_LAYOUT_SETTINGS;
const W = 419.76, H = 595.44; // A5 in points, used as page units

ok(LAYOUTS.length === 11 && new Set(LAYOUTS.map((l) => l.key)).size === 11, "there are 11 layouts with different keys");

const inner = innerBox(W, H, S, null);
ok(near(inner.x, 33.58) && near(inner.y, 33.58) && near(inner.w, 352.6) && near(inner.h, 528.28), "the inner box is the page minus an 8% margin on every side");

const top = place(layoutByKey("picture-top"), W, H, S, 14, null);
ok(top.length === 2 && top[0].role === "picture" && top[1].role === "body", "picture on top, text below, in drawing order");
ok(near(top[0].h, 255.75) && near(top[1].h, 255.75) && near(top[1].y, 33.58 + 255.75 + 16.79), "the two halves are equal and a gap apart");
const left = place(layoutByKey("picture-left"), W, H, S, 14, null);
ok(near(left[0].w, 167.9) && near(left[1].x, 218.27) && near(left[0].h, 528.28), "picture on the left: half the width each, the gap between");
const tl = place(layoutByKey("text-left"), W, H, S, 14, null);
ok(tl[0].role === "body" && tl[1].role === "picture" && near(tl[1].x, 218.27), "the mirrored layout swaps the roles, not the boxes");

const full = place(layoutByKey("full-picture"), W, H, S, 14, null)[0];
ok(full.x === 0 && full.y === 0 && full.w === W && full.h === H, "a full picture covers the whole page, margin ignored");
const cover = place(layoutByKey("cover"), W, H, S, 14, null);
ok(cover[0].role === "picture" && cover[0].w === W && cover[1].role === "title" && cover[1].y > cover[0].y + 100, "a cover draws the picture first (beneath) and the title over it");

const tt = place(layoutByKey("title-text"), W, H, S, 14, null);
ok(tt[0].role === "title" && tt[1].role === "body" && near(tt[1].y, tt[0].y + tt[0].h + 16.79) && near(tt[1].y + tt[1].h, inner.y + inner.h), "the body starts below the title and ends at the margin");
ok(near(tt[0].h, Math.round(14 * 2.5 * 1.3)), "the title is one line tall: body size x 2.5 x 1.3");
const cap = place(layoutByKey("picture-caption"), W, H, S, 14, null);
ok(cap[0].role === "picture" && cap[1].role === "caption" && near(cap[0].y + cap[0].h + 16.79 + cap[1].h, inner.y + inner.h), "the caption sits at the bottom; the picture fills the rest");
ok(place(layoutByKey("two-columns"), W, H, S, 14, null)[0].columns === 2 && place(layoutByKey("title-two-columns"), W, H, S, 14, null)[1].columns === 2, "the two-column layouts ask for 2 columns");

// One set of settings drives every layout.
const wide = { ...S, marginPct: 12, gapPct: 8 };
ok(near(place(layoutByKey("picture-top"), W, H, wide, 14, null)[0].x, 0.12 * W) && near(place(layoutByKey("picture-left"), W, H, wide, 14, null)[1].x - (0.12 * W + place(layoutByKey("picture-left"), W, H, wide, 14, null)[0].w), 0.08 * W), "changing the margin and gap changes every layout");
const split = place(layoutByKey("picture-top"), W, H, { ...S, splitPct: 70 }, 14, null);
ok(near(split[0].h / (split[0].h + split[1].h), 0.7), "the split setting moves the divide");

// The Page Guide margin wins when the guide is on.
const guide = { on: true, format: "match", marginIn: 0.5, pxPerInch: 72 };
const g = innerBox(W, H, S, guide);
ok(near(g.x, 36) && near(g.w, W - 72) && near(g.h, H - 72), "with the Page Guide on, its margin rectangle is the room");
const g2 = innerBox(W, H, S, { ...guide, format: "a6" });
ok(near(g2.w, 105 / 25.4 * 72 - 72) && near(g2.x, (W - 105 / 25.4 * 72) / 2 + 36), "inside the trim box when the guide has a format");
ok(near(innerBox(W, H, S, { ...guide, on: false }).x, 33.58), "the guide off: the percent margin");

// Saved settings are made safe.
const n = normalizeLayoutSettings({ marginPct: 999, gapPct: "x", titleScale: 3, bogus: 1, slotGrey: "#aabbcc" });
ok(n.marginPct === 30 && n.gapPct === S.gapPct && n.titleScale === 3 && n.bogus === undefined && n.slotGrey === "#aabbcc", "out-of-range numbers are clamped, junk is ignored, unknown keys dropped");
ok(normalizeLayoutSettings(null).marginPct === 8 && normalizeLayoutSettings({ slotGrey: "red" }).slotGrey === S.slotGrey, "missing or invalid settings fall back to the defaults");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

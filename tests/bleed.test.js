// Bleed (model/bleed.js) and layouts that respect it (model/pageLayouts.js).
import { bleedPt, cleanBleedMm, cropMarkLines, mmToPt, trimRect, withBleed } from "../apps/ZEditor/src/model/bleed.js";
import { LAYOUTS, place, DEFAULT_LAYOUT_SETTINGS } from "../apps/ZEditor/src/model/pageLayouts.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;

ok(cleanBleedMm("3") === 3 && cleanBleedMm(-4) === 0 && cleanBleedMm(99) === 25 && cleanBleedMm("x") === 0 && cleanBleedMm(3.14159) === 3.1, "a bleed typed in mm is made safe");
ok(near(mmToPt(25.4), 72), "mm to points");
ok(bleedPt({ isBlank: true, bleedMm: 3 }) > 8 && bleedPt({ isBlank: false, bleedMm: 3 }) === 0 && bleedPt({ isBlank: true }) === 0, "only blank pages have a bleed; default none");

const page = { isBlank: true, width: 420, height: 600 };
const a = withBleed(page, 4);
ok(near(a.width, 420 + 2 * mmToPt(4)) && near(a.shiftPt, mmToPt(4)) && a.bleedMm === 4, "adding bleed grows the page on every side and says how far the items move");
const back = withBleed({ ...page, width: a.width, height: a.height, bleedMm: 4 }, 0);
ok(near(back.width, 420) && near(back.height, 600) && near(back.shiftPt, -mmToPt(4)), "removing it gives the trim size back");
const t = trimRect({ ...page, width: a.width, height: a.height, bleedMm: 4 });
ok(near(t.width, 420) && near(t.x, mmToPt(4)), "the trim rectangle is the page minus its bleed");

const marks = cropMarkLines(400, 500, 10, 0);
ok(marks.length === 8, "eight crop marks, two at each corner");
ok(marks.every(([x1, y1, x2, y2]) => (x1 === x2) !== (y1 === y2)), "each mark is a straight horizontal or vertical line");
ok(marks.every(([x1, y1, x2, y2]) => { const inBleed = (x, y) => x > 0 && x < 420 && y > 0 && y < 520; return !inBleed(x1, y1) && !inBleed(x2, y2); }), "no mark touches the bleed area");

const cover = LAYOUTS.find((l) => l.key === "cover"), full = LAYOUTS.find((l) => l.key === "full-text");
const pic = place(cover, 500, 700, DEFAULT_LAYOUT_SETTINGS, 16, null, 20).find((b) => b.role === "picture");
ok(pic.x === 0 && pic.y === 0 && pic.w === 500 && pic.h === 700, "a full-page picture fills the page, bleed included");
const body0 = place(full, 500, 700, DEFAULT_LAYOUT_SETTINGS, 16, null, 0)[0], body20 = place(full, 500, 700, DEFAULT_LAYOUT_SETTINGS, 16, null, 20)[0];
ok(body20.x > body0.x && near(body20.x - 20, 460 * 0.08) && near(body20.w, 460 - 2 * 460 * 0.08), "text margins are measured from the trim, not the page edge");
if (fails) { console.log(fails + " failed"); process.exit(1); }

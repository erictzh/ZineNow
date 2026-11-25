// Coloured, scoped ruler guides (model/guideSet.js).
import { GUIDE_COLORS, guideGroups, guideSnapTargets, guidesOnPage, layoutGuideLines, normalizeGuides, snapGuidePos } from "../apps/ZEditor/src/model/guideSet.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(GUIDE_COLORS.length === 8 && GUIDE_COLORS.map((c) => c.key).join() === "white,yellow,lightblue,lightgreen,lightred,pink,lightgrey,orange", "the eight colours, in order");
const old = normalizeGuides([{ id: "a", axis: "x", pos: 10 }, { axis: "q", pos: 1 }, { id: "b", axis: "y", pos: "x" }, { id: "c", axis: "y", pos: 5, color: "pink", hidden: true, locked: true }, { id: "d", axis: "y", pos: 6, color: "nope" }]);
ok(old.length === 3 && old[0].color === "lightblue" && old[1].color === "pink" && old[1].hidden && old[1].locked && old[2].color === "lightblue", "old guides get the default colour; bad entries and colours are dropped");
ok(normalizeGuides(null).length === 0, "nothing saved, no guides");

const vis = guidesOnPage([{ id: "g1", axis: "x", pos: 1, color: "yellow" }, { id: "g2", axis: "y", pos: 2, color: "pink" }], [{ id: "p1", axis: "x", pos: 3, color: "yellow" }]);
ok(vis.length === 3 && vis[0].scope === "page" && vis[1].scope === "global", "page guides and global guides together, tagged");
const groups = guideGroups(vis);
ok(groups.map((g) => g.label).join("|") === "Page Guides · Alignment|Global Guides · Alignment|Global Guides · Safe area", "groups per scope and colour, only those with guides");

ok(snapGuidePos(9.5, [0, 10, 20], 1) === 10 && snapGuidePos(5, [0, 10], 1) === 5, "a dragged guide snaps within reach only");
const t = guideSnapTargets("x", { width: 400, height: 600 }, 10, 20, [{ axis: "x", pos: 77 }, { axis: "y", pos: 5 }]);
ok([0, 200, 400, 10, 390, 30, 370, 77].every((v) => t.includes(v)) && !t.includes(5), "targets: edges, middle, trim, margins, other guides on the same axis");
const lines = layoutGuideLines([{ x: 10, y: 10, w: 100, h: 50 }, { x: 10, y: 60, w: 100, h: 50 }], 1);
ok(lines.filter((l) => l.axis === "x").length === 2 && lines.filter((l) => l.axis === "y").length === 3, "a layout's guides are the box edges, no duplicates");
if (fails) { console.log(fails + " failed"); process.exit(1); }

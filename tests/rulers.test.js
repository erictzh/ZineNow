// Rulers and ruler guides (model/rulers.js).
import { dragGain, constrainTo45, formatInUnit, guideGap, measureBetween, ptToUnit, rulerTicks, snapToGuides, snapToUnit, unitToPt } from "../apps/ZEditor/src/model/rulers.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;

ok(near(ptToUnit(72, "in"), 1) && near(ptToUnit(72, "mm"), 25.4) && near(unitToPt(25.4, "mm"), 72), "units convert through points");
ok(formatInUnit(unitToPt(42.5, "mm"), "mm") === "42.5 mm", "the readout shows the unit");
ok(near(ptToUnit(snapToUnit(unitToPt(12.4, "mm"), "mm"), "mm"), 12), "Shift snaps to whole millimetres");
ok(near(ptToUnit(snapToUnit(unitToPt(1.3, "in"), "in"), "in"), 1.25), "...and to eighths of an inch");

// A5 width (420 pt) at 1.1 px/pt: numbered ticks at least 48 px apart
const ticks = rulerTicks(0, 420, 1.1, "mm");
const majors = ticks.filter((t) => t.size === "major");
ok(majors.length > 3 && majors.every((t, i) => i === 0 || (t.pt - majors[i - 1].pt) * 1.1 >= 48), "numbered ticks keep their distance");
ok(majors.some((t) => t.value === 40) && majors.every((t) => t.value % 20 === 0) && ticks.some((t) => t.size === "minor"), "numbers fall on round values, with smaller ticks between");
const zoomed = rulerTicks(0, 100, 1.1 * 8, "mm").filter((t) => t.size === "major");
ok(zoomed[1].value - zoomed[0].value < majors[1].value - majors[0].value, "zooming in numbers smaller steps");

// Snapping a moved box
const guides = { x: [100], y: [50] };
ok(JSON.stringify(snapToGuides({ x0: 97, y0: 10, x1: 140, y1: 20 }, guides, 5)) === JSON.stringify({ dx: 3, dy: 0 }), "the left edge snaps to a close vertical guide");
ok(snapToGuides({ x0: 60, y0: 0, x1: 136, y1: 20 }, guides, 5).dx === 2, "the middle snaps too");
ok(snapToGuides({ x0: 0, y0: 44, x1: 20, y1: 47 }, guides, 5).dy === 3, "the bottom edge snaps to a horizontal guide");
ok(snapToGuides({ x0: 0, y0: 0, x1: 20, y1: 20 }, guides, 5).dx === 0, "nothing close, no snap");

// The gap between the two guides around the pointer
const gs = [{ axis: "x", pos: 20 }, { axis: "x", pos: 100 }, { axis: "x", pos: 300 }, { axis: "y", pos: 50 }];
const gap = guideGap(gs, "x", 150);
ok(gap && gap.from === 100 && gap.to === 300 && gap.length === 200, "hovering between two guides gives the gap to the nearest on each side");
ok(guideGap(gs, "x", 10) === null && guideGap(gs, "x", 400) === null, "no gap outside the outermost guides");
ok(guideGap(gs, "y", 60) === null, "a single guide on an axis has no gap");

// The Measure tool
const m = measureBetween({ x: 10, y: 10 }, { x: 13, y: 6 });
ok(near(m.length, 5) && m.dx === 3 && m.dy === -4, "measuring gives the distance and the two legs");
ok(measureBetween({ x: 0, y: 0 }, { x: 1, y: 0 }).angle === 0 && measureBetween({ x: 0, y: 0 }, { x: 0, y: -1 }).angle === 90 && measureBetween({ x: 0, y: 0 }, { x: 0, y: 1 }).angle === 270, "the angle counts counter-clockwise, up being 90°");
const c = constrainTo45({ x: 0, y: 0 }, { x: 10, y: 1 });
ok(near(c.y, 0) && near(c.x, Math.hypot(10, 1)), "Shift snaps a near-horizontal line to horizontal, keeping its length");
const d = constrainTo45({ x: 5, y: 5 }, { x: 15, y: 17 });
ok(near(d.x - 5, d.y - 5), "...and a near-diagonal one to 45°");

// Precision dragging
ok(dragGain(2) === 1 && dragGain(0.5) === 1, "a normal-speed drag follows the pointer exactly");
ok(dragGain(0.05) === 0.1 && dragGain(0.25) === 0.5, "slowing down makes the guide move less than the pointer");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

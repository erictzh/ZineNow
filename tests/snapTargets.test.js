// Snapping onto other items (model/snapTargets.js).
import { snapBox, snapResize } from "../apps/ZEditor/src/model/snapTargets.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const lines = { x: [100, 300], y: [50] };
let s = snapBox({ x0: 96, y0: 200, x1: 150, y1: 260 }, lines, 6);
ok(s.dx === 4 && s.x === 100 && s.dy === 0 && s.y === null, "a moved box's left edge snaps onto a line within reach, the far axis stays");
s = snapBox({ x0: 250, y0: 10, x1: 296, y1: 46 }, lines, 6);
ok(s.dx === 4 && s.x === 300 && s.dy === 4 && s.y === 50, "right edge and bottom edge snap too");
s = snapBox({ x0: 150, y0: 10, x1: 250, y1: 30 }, lines, 6);
ok(s.dx === 0 && s.x === null, "nothing near, no snap");
s = snapBox({ x0: 150, y0: 100, x1: 250, y1: 140 }, { x: [200], y: [] }, 6);
ok(s.x === 200 && s.dx === 0, "the middle snaps too (already on the line)");

const orig = { x: 20, y: 20, width: 70, height: 40 };
let r = snapResize(orig, "e", 7, 3, lines, 6);
ok(r.dx === 10 && r.x === 100 && r.dy === 3 && r.y === null, "dragging the right edge snaps it, the other axis is left alone");
r = snapResize(orig, "w", 85, 0, lines, 6);
ok(r.x === 100 && r.dx === 80, "dragging the left edge snaps it");
r = snapResize(orig, "se", -5, -13, lines, 6);
ok(r.x === null && r.y === 50 && r.dy === -10, "a corner snaps each edge it drags");
r = snapResize(orig, "n", 0, 28, lines, 6);
ok(r.y === 50 && r.dy === 30, "top edge");
if (fails) { console.log(fails + " failed"); process.exit(1); }

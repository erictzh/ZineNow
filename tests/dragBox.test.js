// Dragging out a new rectangle/ellipse (model/geometry.js dragBox): Shift makes it a square / circle.
import { dragBox } from "../apps/ZEditor/src/model/geometry.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const same = (box, x, y, w, h) => box.x === x && box.y === y && box.width === w && box.height === h;

const start = { x: 100, y: 100 };
ok(same(dragBox(start, { x: 160, y: 120 }), 100, 100, 60, 20), "without Shift the box follows the pointer");
ok(same(dragBox(start, { x: 160, y: 120 }, true), 100, 100, 60, 60), "Shift: down-right, the longer side (width) wins");
ok(same(dragBox(start, { x: 120, y: 170 }, true), 100, 100, 70, 70), "Shift: down-right, the longer side (height) wins");
ok(same(dragBox(start, { x: 40, y: 90 }, true), 40, 40, 60, 60), "Shift: up-left grows from the press point towards the pointer");
ok(same(dragBox(start, { x: 130, y: 50 }, true), 100, 50, 50, 50), "Shift: up-right");
ok(same(dragBox(start, { x: 90, y: 140 }, true), 60, 100, 40, 40), "Shift: down-left");
ok(same(dragBox(start, { x: 100, y: 130 }, true), 100, 100, 30, 30), "Shift with no sideways movement still gives a square");
const toggled = [false, true, false].map((shift) => dragBox(start, { x: 150, y: 110 }, shift));
ok(same(toggled[0], 100, 100, 50, 10) && same(toggled[1], 100, 100, 50, 50) && same(toggled[2], 100, 100, 50, 10), "pressing and releasing Shift at the same pointer spot switches circle ↔ free");

if (fails) { console.log(`${fails} failed`); process.exit(1); }

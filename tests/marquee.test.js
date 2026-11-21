// The Marquee tool's geometry and how a new layer joins the page (model/marquee.js).
import { applyMarqueeResult, dragBox, polygonPressAction, polygonWithPoint, startPolygon, isUsableMarquee, marqueeCenter, pointInPolygon, pointsBounds, rectMarquee, regionPolygon, rotatedMarquee, translatedMarquee } from "../apps/ZEditor/src/model/marquee.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const nearPoints = (a, b) => a.length === b.length && a.every((p, i) => near(p[0], b[i][0]) && near(p[1], b[i][1]));

// A rectangle's outline
const box = rectMarquee({ x: 10, y: 20, width: 40, height: 20 });
ok(nearPoints(regionPolygon(box), [[10, 20], [50, 20], [50, 40], [10, 40]]), "an upright rectangle's corners are its four corners, clockwise from the top left");
const turned = regionPolygon({ ...box, angle: 90 });
ok(nearPoints(turned, [[40, 10], [40, 50], [20, 50], [20, 10]]), "turned 90 degrees about its centre, the corners move round");
const b = pointsBounds(turned);
ok(near(b.x, 20) && near(b.y, 10) && near(b.width, 20) && near(b.height, 40), "the bounds of a turned rectangle swap width and height");

// Dragging out a box
const d1 = dragBox({ x: 50, y: 50 }, { x: 20, y: 80 });
ok(d1.x === 20 && d1.y === 50 && d1.width === 30 && d1.height === 30, "a drag up and to the left still gives a box with its corner at the top left");
const d2 = dragBox({ x: 10, y: 10 }, { x: 40, y: 20 }, true, false);
ok(d2.width === 30 && d2.height === 30 && d2.x === 10 && d2.y === 10, "Shift makes it square, on the longer side");
const d3 = dragBox({ x: 100, y: 100 }, { x: 110, y: 90 }, true, false);
ok(d3.x === 100 && d3.y === 90 && d3.width === 10 && d3.height === 10, "...towards where the pointer went");
const d4 = dragBox({ x: 100, y: 100 }, { x: 130, y: 120 }, false, true);
ok(d4.x === 70 && d4.y === 80 && d4.width === 60 && d4.height === 40, "Alt grows it out from the start point, which stays its middle");

// Inside / outside
const tri = [[0, 0], [10, 0], [0, 10]];
ok(pointInPolygon(2, 2, tri) && !pointInPolygon(8, 8, tri), "a point inside a triangle is in, one past its long edge is out");
ok(pointInPolygon(30, 30, regionPolygon({ ...box, x: 0, y: 0, width: 60, height: 60, angle: 45 })), "the middle of a turned rectangle is inside it");

// Moving and turning
const moved = translatedMarquee({ kind: "polygon", points: [[0, 0], [4, 0], [4, 4]], closed: true }, 5, -2);
ok(nearPoints(moved.points, [[5, -2], [9, -2], [9, 2]]), "a polygon moves by moving every point");
ok(near(translatedMarquee(box, 3, 4).x, 13) && near(translatedMarquee(box, 3, 4).y, 24), "a rectangle moves by x and y");
const spun = rotatedMarquee(box, 90, 0, 0);
// Turning the rectangle about a point moves exactly the corners a direct rotation would
const direct = regionPolygon(box).map(([x, y]) => [-y, x]);
ok(nearPoints(regionPolygon(spun), direct), "turning a rectangle 90 degrees about a point matches turning each corner");
ok(near(spun.angle, 90), "...and records the angle");
ok(near(rotatedMarquee({ ...box, angle: 350 }, 20, 0, 0).angle, 10), "the angle wraps into 0-360");
const poly = { kind: "polygon", points: [[0, 0], [10, 0], [10, 10], [0, 10]], closed: true };
const polyTurned = rotatedMarquee(poly, 180, 5, 5);
ok(nearPoints(polyTurned.points, [[10, 10], [0, 10], [0, 0], [10, 0]]), "a polygon turned 180 degrees about its middle lands on itself, shifted round");
ok(marqueeCenter(poly).x === 5 && marqueeCenter(box).y === 30, "the centre of a polygon and of a rectangle");

// What counts as a marquee
ok(isUsableMarquee(box) && !isUsableMarquee(rectMarquee({ x: 0, y: 0, width: 2, height: 50 })) && !isUsableMarquee(null), "a rectangle needs some size");
ok(isUsableMarquee(poly) && !isUsableMarquee({ ...poly, closed: false }) && !isUsableMarquee({ kind: "polygon", points: [[0, 0], [1, 1]], closed: true }), "a polygon must be closed and have 3+ points");

// Drawing a polygon
let drawing = startPolygon({ x: 0, y: 0 });
ok(drawing.kind === "polygon" && !drawing.closed && drawing.points.length === 1, "a polygon starts open with its first point");
drawing = polygonWithPoint(polygonWithPoint(drawing, { x: 100, y: 0 }), { x: 100, y: 100 });
ok(drawing.points.length === 3 && !isUsableMarquee(drawing) && isUsableMarquee({ ...drawing, closed: true }), "it can only make a layer once closed");
ok(polygonPressAction(drawing, { x: 50, y: 50 }, 1) === "add", "a press away from the points adds a corner");
ok(polygonPressAction(drawing, { x: 3, y: 4 }, 1) === "close", "a press on the first point closes it");
ok(polygonPressAction(drawing, { x: 100, y: 102 }, 1) === "close", "a press on the last point (a double click) closes it");
ok(polygonPressAction(drawing, { x: 30, y: 30 }, 0.1) === "close", "the close distance is in screen px: zoomed out, a wider page distance counts");
const two = polygonWithPoint(startPolygon({ x: 0, y: 0 }), { x: 100, y: 0 });
ok(polygonPressAction(two, { x: 2, y: 1 }, 1) === "add" && polygonPressAction(two, { x: 101, y: 0 }, 1) === "ignore", "with fewer than 3 points nothing closes; a repeat on the last point is ignored");

// Adding the layer
const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
const above = applyMarqueeResult(items, { sourceId: 2, sourcePatch: null, layer: { type: "image" }, cover: null }, 9, null);
ok(above.map((a) => a.id).join() === "1,2,9,3", "a layer made from one layer goes straight above it");
const onTop = applyMarqueeResult(items, { sourceId: null, layer: { type: "image" }, cover: { type: "rect" } }, 9, 8);
ok(onTop.map((a) => a.id).join() === "1,2,3,8,9" && onTop[3].type === "rect", "a layer made from everything goes on top, with its cover just under it");
const cutFrom = applyMarqueeResult(items, { sourceId: 1, sourcePatch: { src: "new" }, layer: {}, cover: null }, 9, null);
ok(cutFrom[0].src === "new" && cutFrom[1].id === 9 && items[0].src === undefined, "a cut patches the source (without changing the original list)");
ok(applyMarqueeResult(items, { sourceId: 77, layer: {}, cover: null }, 9, null).map((a) => a.id).join() === "1,2,3,9", "a source that has gone leaves the layer on top");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log("\nall marquee checks passed");

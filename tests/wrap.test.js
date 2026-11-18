// Text wrap (model/text/textWrap.js), the composer's per-line slots and the flow around obstacles (render/textLayout.js).
import { freeSlot, wrapObstaclesFor, wrapPolygons } from "../apps/ZEditor/src/model/text/textWrap.js";
import { composeText } from "../apps/ZEditor/src/render/composer.js";
import { flowAroundObstacles } from "../apps/ZEditor/src/render/textLayout.js";
import { opaqueRows } from "../apps/ZEditor/src/render/wrapShapes.js";
import { MAIN_SCALE } from "../apps/ZEditor/src/constants.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const measure = (s) => Array.from(s).length * 10;
const rect = (x0, y0, x1, y1) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], offset: 0 });

// freeSlot
ok(JSON.stringify(freeSlot([], 0, 100, 0, 10, 5)) === JSON.stringify({ x: 0, width: 100 }), "no obstacles: the whole line");
let s = freeSlot([rect(0, 0, 40, 50)], 0, 100, 10, 20, 5);
ok(near(s.x, 40) && near(s.width, 60), "obstacle on the left: text starts after it");
s = freeSlot([rect(70, 0, 100, 50)], 0, 100, 10, 20, 5);
ok(near(s.x, 0) && near(s.width, 70), "obstacle on the right: line ends before it");
s = freeSlot([rect(30, 0, 50, 50)], 0, 100, 10, 20, 5);
ok(near(s.x, 50) && near(s.width, 50), "obstacle in the middle: the wider side");
ok(freeSlot([rect(0, 0, 100, 50)], 0, 100, 10, 20, 5) === null, "fully blocked line: no slot");
s = freeSlot([rect(0, 0, 40, 50)], 0, 100, 60, 70, 5);
ok(near(s.width, 100), "band below the obstacle: free");
s = freeSlot([{ ...rect(0, 0, 40, 50), offset: 5 }], 0, 100, 52, 60, 5);
ok(near(s.x, 45), "the wrap offset pushes the text away sideways and below");
s = freeSlot([rect(0, 0, 20, 20)], 0, 100, 5, 10, 5, 2);
ok(near(s.x, 40), "obstacles are scaled to the layout's scale");
// A diamond: the edge is interpolated, not just vertices.
s = freeSlot([{ pts: [[50, 0], [100, 50], [50, 100], [0, 50]], offset: 0 }], 0, 200, 20, 30, 5);
ok(near(s.x, 80) && near(s.width, 120), "a slanted edge is followed (diamond)");

// wrapPolygons: box, rotated box, ellipse, image rows with a crop
const box = wrapPolygons({ type: "image", textWrap: "box", x: 10, y: 20, width: 30, height: 40 });
ok(box.length === 1 && JSON.stringify(box[0]) === JSON.stringify([[10, 20], [40, 20], [40, 60], [10, 60]]), "bounding box");
const turned = wrapPolygons({ type: "rect", textWrap: "box", x: 0, y: 0, width: 20, height: 20, angle: 90 })[0];
ok(near(turned[0][0], 20) && near(turned[0][1], 0), "rotated about the centre");
const ell = wrapPolygons({ type: "rect", shape: "ellipse", textWrap: "shape", x: 0, y: 0, width: 100, height: 50 })[0];
ok(ell.length === 48 && Math.max(...ell.map((p) => p[0])) <= 100 + 1e-9 && near(Math.min(...ell.map((p) => p[1])), 0, 0.2), "ellipse outline");
const rows = [{ y0: 0, y1: 10, x0: 0, x1: 100 }, { y0: 10, y1: 20, x0: 40, x1: 60 }, { y0: 90, y1: 100, x0: 0, x1: 10 }];
const shaped = wrapPolygons({ type: "image", textWrap: "shape", x: 0, y: 0, width: 50, height: 50, naturalWidth: 100, naturalHeight: 100, cropX: 0, cropY: 0, cropW: 100, cropH: 50 }, rows);
ok(shaped.length === 2, "rows outside the crop are dropped");
ok(JSON.stringify(shaped[1]) === JSON.stringify([[20, 10], [30, 10], [30, 20], [20, 20]]), "rows scale from natural px to the box");

// opaqueRows on a tiny alpha map: 4x4, a 2x2 opaque square in the middle
const data = new Uint8ClampedArray(4 * 4 * 4);
for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) data[(y * 4 + x) * 4 + 3] = 255;
const or = opaqueRows(data, 4, 4, 1, 10);
ok(or.length === 2 && JSON.stringify(or[0]) === JSON.stringify({ y0: 10, y1: 20, x0: 10, x1: 30 }), "opaque rows found and scaled");

// wrapObstaclesFor: overlap test and frame-local coordinates
const frame = { id: 1, type: "text", x: 100, y: 100, width: 200 };
const pic = { id: 2, type: "image", textWrap: "box", wrapOffset: 0, x: 120, y: 150, width: 50, height: 50 };
const obs = wrapObstaclesFor(frame, [frame, pic], () => null);
ok(obs && obs.length === 1 && JSON.stringify(obs[0].pts[0]) === JSON.stringify([20, 50]), "an overlapping image becomes an obstacle in frame coordinates");
ok(wrapObstaclesFor(frame, [frame, { ...pic, x: 400 }], () => null) === null, "an image beside the frame doesn't");
ok(wrapObstaclesFor({ ...frame, frameHeight: 10 }, [frame, pic], () => null) === null, "an image below a fixed-height frame doesn't");
ok(wrapObstaclesFor({ ...frame, width: undefined }, [frame, pic], () => null) === null, "a box with no set width doesn't wrap");
ok(wrapObstaclesFor(frame, [frame, { ...pic, textWrap: undefined }], () => null) === null, "an image without Text wrap doesn't");
ok(wrapObstaclesFor(frame, [frame, { ...pic, hidden: true }], () => null) === null, "a hidden image doesn't");
ok(near(wrapObstaclesFor(frame, [frame, { ...pic, wrapOffset: 6 }], () => null)[0].offset, 6 * MAIN_SCALE), "offset in pt becomes editor px");

// Composer slots
const text = "aa bb cc dd ee ff gg hh ii jj kk ll";
const slotted = composeText(text, measure, { width: 100, composer: "single", slotFor: (p, k) => (k < 2 ? { x: 40, width: 60 } : { x: 0, width: 100 }) });
ok(slotted[0].x === 40 && slotted[1].x === 40 && slotted[2].x === 0, "lines take their slot's left edge");
ok(slotted[0].natural <= 60 && slotted[2].natural > 60, "...and its width");
const kp = composeText(text, measure, { width: 100, composer: "paragraph", align: "justify", slotFor: (p, k) => (k < 2 ? { x: 40, width: 60 } : { x: 0, width: 100 }) });
ok(near(kp[0].width, 60) && near(kp[2].width, 100), "paragraph composer justifies each line to its own slot");
const counts = [];
composeText("aa bb cc\ndd", measure, { width: 50, onParagraph: (p, n) => counts.push([p, n]) });
ok(JSON.stringify(counts) === JSON.stringify([[0, 2], [1, 1]]), "onParagraph reports each paragraph's line count");

// Flow around an obstacle: a 1-column box 100 wide, lines 10 high, obstacle on the left 0..50 x 0..25
const flowArgs = { columns: 1, columnWidth: 100, columnGap: 0, lineHeight: 10, paraGap: 0, padX: 0, padY: 0, scale: 1, minSlot: 15, H: Infinity };
const flow = flowAroundObstacles(text, measure, { width: 100, composer: "single" }, { ...flowArgs, wrap: [rect(0, 0, 50, 25)] });
ok(flow.lines[0].x === 50 && flow.lines[2].x === 50 && flow.lines[3].x === 0, "lines beside the obstacle start after it; lines below are full width");
ok(flow.lines.every((l) => l.x + l.natural <= 100 + 1e-6), "no line runs past the box");
// A full-width obstacle: lines jump below it
const jump = flowAroundObstacles("aa bb", measure, { width: 100, composer: "single" }, { ...flowArgs, wrap: [rect(0, 0, 100, 22)] });
ok(jump.lines[0].top >= 22 && jump.lines[0].x === 0, "a fully blocked line moves down past the obstacle");
// Frames with columns: overflow past the last column is hidden
const cols = flowAroundObstacles(text, measure, { width: 40, composer: "single" }, { ...flowArgs, columns: 2, columnWidth: 40, columnGap: 20, H: 20, wrap: [rect(-100, -100, -90, -90)] });
ok(cols.lines[0].col === 0 && cols.lines[2].col === 1 && near(cols.lines[2].x, 60), "lines fill column 1, then column 2 (offset by width + gap)");
ok(cols.overflow && cols.lines.some((l) => l.hidden), "text past the last column is hidden");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

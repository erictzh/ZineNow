// Clipping masks: which layer a layer is clipped to (model/clipping.js).
import { canClipAt, clipBaseIndex, isClipped } from "../apps/ZEditor/src/model/clipping.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const shield = { id: 1, type: "image" };
const flag = { id: 2, type: "image", clipToBelow: true };
const stars = { id: 3, type: "image", clipToBelow: true };
const label = { id: 4, type: "text" };
const box = { id: 5, type: "rect" };
const scribble = { id: 6, type: "stroke" };

ok(isClipped(flag) && !isClipped(shield) && isClipped({ type: "rect", clipToBelow: true }) && isClipped({ type: "text", clipToBelow: true }) && !isClipped(null), "any kind of layer marked clipToBelow is clipped");
ok(clipBaseIndex([shield, flag], 1) === 0, "a layer clips to the layer directly below it");
ok(clipBaseIndex([shield, flag, stars], 2) === 0, "several clipped layers in a row all clip to the same layer");
ok(clipBaseIndex([shield, label, { ...flag }], 2) === 1, "text or a shape can be the layer clipped to");
ok(clipBaseIndex([shield, flag], 0) === -1 && clipBaseIndex([flag, stars], 1) === -1, "nothing below, or only clipped layers below, means no base");
ok(clipBaseIndex([shield, { ...shield, id: 9 }, flag], 2) === 1, "the nearest unclipped layer below is the base");
ok(clipBaseIndex([box, { ...label, clipToBelow: true }, { ...scribble, clipToBelow: true }], 2) === 0, "text and strokes can be clipped too, to the same base");

ok(canClipAt([shield, { id: 7, type: "image" }], 1), "an unclipped layer above another layer can be clipped");
ok(canClipAt([shield, label], 1) && canClipAt([shield, box], 1) && canClipAt([shield, scribble], 1), "text, shapes and strokes can be clipped");
ok(!canClipAt([{ id: 7, type: "image" }], 0), "the bottom layer has nothing to clip to");
ok(!canClipAt([flag, { id: 8, type: "text" }], 1), "layers above only a clipped one have no base");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log("\nall clipping checks passed");

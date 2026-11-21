// Clipping masks: which layer an image is clipped to (model/clipping.js).
import { canClipAt, clipBaseIndex, isClippedImage } from "../apps/ZEditor/src/model/clipping.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const shield = { id: 1, type: "image" };
const flag = { id: 2, type: "image", clipToBelow: true };
const stars = { id: 3, type: "image", clipToBelow: true };
const label = { id: 4, type: "text" };

ok(isClippedImage(flag) && !isClippedImage(shield) && !isClippedImage({ type: "rect", clipToBelow: true }) && !isClippedImage(null), "only an image marked clipToBelow is a clipped image");
ok(clipBaseIndex([shield, flag], 1) === 0, "an image clips to the layer directly below it");
ok(clipBaseIndex([shield, flag, stars], 2) === 0, "several clipped images in a row all clip to the same layer");
ok(clipBaseIndex([shield, label, flag], 2) === 1, "text or a shape can be the layer clipped to");
ok(clipBaseIndex([shield, flag], 0) === -1 && clipBaseIndex([flag, stars], 1) === -1, "nothing below, or only clipped images below, means no base");
ok(clipBaseIndex([shield, { ...shield, id: 9 }, flag], 2) === 1, "the nearest unclipped layer below is the base");

ok(canClipAt([shield, { id: 5, type: "image" }], 1), "an unclipped image above another layer can be clipped");
ok(!canClipAt([{ id: 5, type: "image" }], 0), "the bottom layer has nothing to clip to");
ok(!canClipAt([shield, label], 1), "only images can be clipped");
ok(!canClipAt([flag, { id: 6, type: "image" }], 1), "two images above only a clipped one have no base");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log("\nall clipping checks passed");

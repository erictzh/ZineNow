// The T- / T+ buttons: moving every size in a text box by a step (ZEditor/src/model/text/textSize.js).
import { sizeStepPatch } from "../apps/ZEditor/src/model/text/textSize.js";
import { pxToPt, ptToPx } from "../apps/ZEditor/src/model/text/textLook.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const near = (a, b) => Math.abs(a - b) < 0.01;
const box = (pt, runs) => ({ fontSize: ptToPx(pt), colorRuns: runs });

let p = sizeStepPatch(box(12), 1);
ok(near(pxToPt(p.fontSize), 13), "12 pt + 1 = 13 pt");
p = sizeStepPatch(box(12), -1);
ok(near(pxToPt(p.fontSize), 11), "12 pt - 1 = 11 pt");
p = sizeStepPatch(box(12.5), 1);
ok(near(pxToPt(p.fontSize), 13.5), "a fractional size keeps its fraction: 12.5 + 1 = 13.5");
ok(sizeStepPatch(box(12), 1).colorRuns === undefined, "a box without letter sizes gets only fontSize");
ok(sizeStepPatch({ fontSize: undefined }, 1) !== null, "a box with no size set counts as the 16 px default");
ok(Math.abs(pxToPt(sizeStepPatch({}, 1).fontSize) - (pxToPt(16) + 1)) < 0.06, "...so + 1 from the default (rounded to 0.1 pt, as the size box shows)");

ok(sizeStepPatch(box(200), 1) === null, "at 200 pt, + does nothing");
ok(sizeStepPatch(box(4), -1) === null, "at 4 pt, - does nothing");
p = sizeStepPatch(box(4.5), -1);
ok(near(pxToPt(p.fontSize), 4), "4.5 - 1 stops at the 4 pt limit");
p = sizeStepPatch(box(199.5), 1);
ok(near(pxToPt(p.fontSize), 200), "199.5 + 1 stops at 200 pt");

// sizes set on stretches of letters move too, and other props are kept
const runs = [{ start: 0, end: 2, fontSize: ptToPx(20), color: "#f00" }, { start: 2, end: 5, bold: true }, { start: 5, end: 7, fontSize: ptToPx(200) }];
p = sizeStepPatch(box(12, runs), 1);
ok(near(pxToPt(p.fontSize), 13), "the box's own size moves");
ok(near(pxToPt(p.colorRuns[0].fontSize), 21) && p.colorRuns[0].color === "#f00", "a stretch's size moves, its colour stays");
ok(p.colorRuns[1] === runs[1], "a stretch without a size is left as it was");
ok(near(pxToPt(p.colorRuns[2].fontSize), 200), "a stretch already at 200 pt stays there");
p = sizeStepPatch(box(200, runs), 1);
ok(p && p.fontSize === undefined && near(pxToPt(p.colorRuns[0].fontSize), 21), "when the box is at its limit but a stretch isn't, the stretch still moves");
ok(!("colorRuns" in sizeStepPatch(box(12, [{ start: 0, end: 2, bold: true }]), 1)), "stretches with no size don't appear in the patch");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);

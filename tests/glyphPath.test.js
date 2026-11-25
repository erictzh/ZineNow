// Text as outlines (model/glyphPath.js), checked against a real font when this computer has one.
import fs from "node:fs";
import fontkitModule from "../shared/vendor/fontkit/fontkit.umd.min.js";
import { textPathData } from "../apps/ZEditor/src/model/glyphPath.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const FONT = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf", "/Library/Fonts/Arial.ttf"].find((p) => fs.existsSync(p));
if (!FONT) console.log("skip: no font file on this computer");
else {
  // The vendored fontkit is a browser bundle: it hangs itself on `this`/window.
  const fk = fontkitModule && fontkitModule.create ? fontkitModule : fontkitModule.default;
  const font = fk.create(new Uint8Array(fs.readFileSync(FONT)));
  const d = textPathData(font, "Hi", 10, 100, 40, 0);
  ok(typeof d === "string" && d.startsWith("M") && d.includes("Z"), "text becomes closed path data");
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  ok(nums.length > 20, "with real coordinates");
  const xs = nums.filter((_, i) => i % 2 === 0);
  ok(Math.min(...xs) >= 9, "the letters start at the given x");
  const wide = textPathData(font, "Hi", 10, 100, 40, 10), tight = textPathData(font, "Hi", 10, 100, 40, 0);
  const maxX = (path) => Math.max(...path.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 0));
  ok(maxX(wide) > maxX(tight) + 5, "extra letter spacing pushes the letters apart");
  ok(textPathData(font, "A\u{10FFFD}", 0, 0, 20, 0) === null, "a letter the font lacks gives null (the caller keeps live text)");
  ok(textPathData(font, "  ", 0, 0, 20, 0) === "", "only spaces: nothing to draw");
}
if (fails) { console.log(fails + " failed"); process.exit(1); }

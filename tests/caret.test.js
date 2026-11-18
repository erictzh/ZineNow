// Caret, selection and hit-testing on composed lines (render/textCaret.js).
import { composeText } from "../apps/ZEditor/src/render/composer.js";
import * as C from "../apps/ZEditor/src/render/textCaret.js";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL:", m); } else console.log("ok  :", m); };
const measure = (s) => s.length * 10;
const text = "the quick brown fox jumps over the lazy dog\nsecond paragraph is here and wraps too";
for (const align of ["left", "justify"]) {
  const lines = composeText(text, measure, { width: 150, align, composer: "paragraph" });
  lines.forEach((l, i) => { l.top = i * 20; });
  const layout = { typesetLines: lines, measure, padX: 5, padY: 3, lineHeight: 20, fontSize: 16 };
  // Every index maps to a caret and back to itself (except the gap after a consumed space, which snaps to a boundary).
  let bad = [];
  for (let i = 0; i <= text.length; i++) {
    const r = C.caretRect(layout, i);
    const back = C.indexAtX(layout, r.line, r.x);
    // The index right after a wrapped line's space is the next line's start: both round-trip.
    const same = back === i || (i >= lines[r.line].visibleEnd && i < lines[r.line].end && back <= lines[r.line].end);
    if (!same) bad.push(`${i}->${back}`);
  }
  ok(bad.length === 0, `${align}: caret x round-trips to the same index for all ${text.length + 1} positions ${bad.slice(0, 5).join(",")}`);
  ok(C.indexAtPoint(layout, 9999, 3 + 5) === lines[0].visibleEnd, `${align}: clicking right of the first line puts the caret at its end`);
  ok(C.indexAtPoint(layout, 0, -50) === lines[0].start, `${align}: clicking above puts the caret at the start`);
  const lastLine = lines.length - 1;
  ok(C.indexAtPoint(layout, 9999, 9999) === text.length, `${align}: clicking below puts the caret at the very end`);
  // Vertical moves keep the column
  const i0 = 4; const r0 = C.caretRect(layout, i0);
  const down = C.moveVertical(layout, i0, 1, r0.x, text.length); const rd = C.caretRect(layout, down);
  ok(rd.line === r0.line + 1 && Math.abs(rd.x - r0.x) <= 10, `${align}: ArrowDown goes to the next line near the same x (${r0.x} -> ${rd.x})`);
  ok(C.moveVertical(layout, 0, -1, 0, text.length) === 0 && C.moveVertical(layout, text.length, 1, 0, text.length) === text.length, `${align}: Up on the first / Down on the last line go to the ends`);
  const rects = C.selectionRects(layout, 4, 30);
  ok(rects.length >= 2 && rects.every((r) => r.width > 0), `${align}: a multi-line selection gives one rect per line (${rects.length})`);
  ok(C.selectionRects(layout, 7, 7).length === 0, `${align}: empty selection draws nothing`);
}
ok(JSON.stringify(C.wordRangeAt("hello big world", 7)) === "[6,9]", "word range around a position");
ok(JSON.stringify(C.paragraphRangeAt("aa\nbbb\ncc", 4)) === "[3,6]", "paragraph range around a position");
console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);

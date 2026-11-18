// Custom text spans (model/text/colorRuns.js) and the composer's span-aware measuring and per-paragraph alignment.
import { composeText } from "../apps/ZEditor/src/render/composer.js";
import { adjustRunsForEdit, clearRunProps, colorSegments, hasLayoutSpans, normalizeRuns, runAt, setRunColor, setRunProps } from "../apps/ZEditor/src/model/text/colorRuns.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const j = (x) => JSON.stringify(x);

// Setting props
let runs = setRunProps(undefined, 2, 5, { bold: true });
ok(j(runs) === j([{ start: 2, end: 5, bold: true }]), "a span is made over the selection");
runs = setRunProps(runs, 4, 8, { color: "#f00" });
ok(j(runs) === j([{ start: 2, end: 4, bold: true }, { start: 4, end: 5, bold: true, color: "#f00" }, { start: 5, end: 8, color: "#f00" }]), "overlapping props split the span and keep each other");
ok(j(setRunProps(runs, 0, 10, { bold: null, color: null })) === "[]", "clearing every prop removes the spans");
ok(j(clearRunProps(runs, 4, 5)) === j([{ start: 2, end: 4, bold: true }, { start: 5, end: 8, color: "#f00" }]), "Reset selected clears just that stretch");
ok(j(setRunProps([{ start: 0, end: 3, bold: false }], 3, 6, { bold: false })) === j([{ start: 0, end: 6, bold: false }]), "false is kept (un-bold inside a bold box) and neighbours merge");
ok(j(setRunColor([{ start: 0, end: 3, color: "#000", italic: true }], 0, 3, null)) === j([{ start: 0, end: 3, italic: true }]), "clearing the colour keeps the span's other props");
ok(j(normalizeRuns([{ start: 0, end: 2 }])) === "[]", "a span with no props is dropped");
ok(runAt(runs, 4).bold === true && runAt(runs, 9) === null, "runAt finds the span at an index");
ok(hasLayoutSpans([{ start: 0, end: 1, fontSize: 30 }]), "a span size changes the layout");
ok(hasLayoutSpans([{ start: 0, end: 1, fontFamily: "Georgia" }]) && !hasLayoutSpans([{ start: 0, end: 1, color: "#f00", underline: true }]), "only font, bold, italic and align change the layout");
ok(j(adjustRunsForEdit([{ start: 2, end: 4, bold: true }], "abcdef", "abcXdef")) === j([{ start: 2, end: 5, bold: true }]), "typing inside a span keeps its props");
const segs = colorSegments("abcdef", [{ start: 1, end: 3, underline: true }]);
ok(segs.length === 3 && segs[1].span.underline === true && segs[1].color === null && segs[0].span === null, "segments carry their span");

// The composer measures each word where it sits in the text
const wide = (s, at) => { let w = 0; for (let i = 0; i < s.length; i++) w += (at != null && at + i >= 6 && at + i < 11) ? 20 : 10; return w; };
const lines = composeText("aaaaa bbbbb ccccc", wide, { width: 1000 });
ok(lines[0].pieces[1].width === 100 && lines[0].pieces[0].width === 50, "a styled word is measured in its own width");

// Paragraph alignment from a span
const measure = (s) => s.length * 10;
const aligned = composeText("aa\nbb", measure, { width: 100, align: "left", alignAt: (offset) => (offset === 3 ? "right" : null) });
ok(aligned[0].x === 0 && aligned[1].x === 80, "a paragraph's own align overrides the box's");
const justified = composeText("aa bb cc dd ee ff gg hh\nzz", measure, { width: 60, align: "left", alignAt: (offset) => (offset === 0 ? "justify" : null) });
ok(justified[0].width === 60 && justified[justified.length - 1].width === 20, "justify per paragraph fills its lines, other paragraphs stay ragged");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

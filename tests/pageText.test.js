// A whole page's text laid out together (render/pageText.js): threaded stories and text wrap,
// through the real layoutText, with a fake canvas whose letters are all 0.5 em wide.
import { resolvePageText } from "../apps/ZEditor/src/render/pageText.js";
import { layoutTextBox, measureTextBox } from "../apps/ZEditor/src/render/textLayout.js";
globalThis.document = {
  createElement: () => {
    const ctx = {
      font: "", letterSpacing: "0px", fontKerning: "auto", textBaseline: "alphabetic",
      measureText(s) {
        const size = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 16])[1]);
        return { width: Array.from(s).length * size * 0.5, fontBoundingBoxAscent: size * 0.8, fontBoundingBoxDescent: size * 0.2 };
      },
    };
    return { getContext: () => ctx };
  },
};
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };
const shown = (ann) => layoutTextBox(ann).typesetLines.filter((l) => !l.hidden).map((l) => l.pieces.map((p) => p.text).join(" ")).join(" ");

const words = Array.from({ length: 60 }, (_, i) => "w" + i).join(" ");
const head = { id: 1, type: "text", text: words, x: 0, y: 0, width: 120, frameHeight: 40, fontSize: 10, indentFirst: 4 };
const f2 = { id: 2, type: "text", text: "", x: 200, y: 0, width: 120, frameHeight: 40, threadFrom: 1 };
const f3 = { id: 3, type: "text", text: "", x: 400, y: 0, width: 60, frameHeight: 400, threadFrom: 2 };

// Nothing special on the page: the very same list comes back (so plain pages draw exactly as before).
const plain = [{ ...head, frameHeight: undefined }, { id: 5, type: "image", x: 0, y: 0, width: 10, height: 10 }];
ok(resolvePageText(plain) === plain, "a page with no threads or wrap is returned unchanged");

const page = [head, f2, f3];
const out = resolvePageText(page);
ok(resolvePageText(page) === out, "cached per annotations list");
const [h, a, b] = out;
ok(h.storyHeadId === 1 && a.storyIndex === 1 && b.storyIndex === 2 && h.storyNextId === 2 && b.storyNextId === undefined, "frames know their place in the story");
const all = [shown(h), shown(a), shown(b)].filter(Boolean).join(" ");
ok(all === words, "every word appears exactly once across the three frames, in order");
ok(shown(h).length > 0 && shown(a).length > 0 && shown(b).length > 0, "each frame gets some of the story");
ok(a.storyContinues || a.text.startsWith("w"), "the second frame continues the story");
ok(layoutTextBox(a).typesetLines[0].x === 0, "no first-line indent where a paragraph continues in the next frame");
ok(!measureTextBox(b).overflow, "the last frame is tall enough: no overflow");
ok(measureTextBox({ ...b, frameHeight: 20 }).overflow, "a short last frame overflows");
ok(resolvePageText(out).every((v, i) => shown(v) === shown(out[i])), "resolving the resolved list changes nothing");

// Empty story: followers are empty frames, still frames.
const empty = resolvePageText([{ ...head, text: "" }, f2]);
ok(empty[1].text === "" && empty[1].storyHeadId === 1 && measureTextBox(empty[1]).height > 30, "an empty follower keeps its frame size");

// Text wrap: an image on the left half of a box pushes the first lines right.
const box = { id: 1, type: "text", text: words, x: 0, y: 0, width: 200, fontSize: 10 };
const pic = { id: 2, type: "image", textWrap: "box", wrapOffset: 0, x: 0, y: 0, width: 100, height: 30, naturalWidth: 100, naturalHeight: 30 };
const [wrapped] = resolvePageText([box, pic]);
ok(Array.isArray(wrapped.wrapObstacles) && wrapped.wrapObstacles.length === 1, "the overlapped box gets the obstacle");
const lines = layoutTextBox(wrapped).typesetLines;
const padX = layoutTextBox(wrapped).padX;
console.log("    first line x", lines[0].x, "top", lines[0].top, "last x", lines.at(-1).x, "padX", padX);
ok(padX + lines[0].x >= 100 - 1e-6 && lines.at(-1).x === 0, "lines beside the image start after it; lines below it are back at the left");
ok(lines.every((l) => l.x + l.natural <= 200 + 1e-6), "no wrapped line runs past the box");
ok(shown(wrapped) === words, "wrap keeps every word");
const [unwrapped] = resolvePageText([box, { ...pic, textWrap: undefined }]);
ok(unwrapped === box, "turning wrap off gives the box back untouched");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

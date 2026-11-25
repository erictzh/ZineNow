// A story that runs on across pages (render/pageText.js): the words of one story over frames on three pages.
import { resolvePageText, setTextDocument, storyStateOfPages } from "../apps/ZEditor/src/render/pageText.js";
import { layoutTextBox } from "../apps/ZEditor/src/render/textLayout.js";
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
const f1 = { id: 1, type: "text", text: words, x: 0, y: 0, width: 120, frameHeight: 40, fontSize: 10 };
const f2 = { id: 2, type: "text", text: "", x: 0, y: 0, width: 120, frameHeight: 40, threadFrom: 1 };
const f3 = { id: 3, type: "text", text: "", x: 0, y: 0, width: 60, frameHeight: 400, threadFrom: 2 };
const pages = [{ key: 1, annotations: [f1] }, { key: 2, annotations: [f2] }, { key: 3, annotations: [f3] }];

const r1 = resolvePageText(pages[0].annotations, pages), r2 = resolvePageText(pages[1].annotations, pages), r3 = resolvePageText(pages[2].annotations, pages);
ok(r1[0].storyHeadId === 1 && r2[0].storyHeadId === 1 && r3[0].storyIndex === 2, "frames on three pages know they are one story, in order");
const all = [shown(r1[0]), shown(r2[0]), shown(r3[0])].filter(Boolean).join(" ");
ok(all === words, "every word appears exactly once across the three pages, in order");
ok(shown(r1[0]).length > 0 && shown(r2[0]).length > 0 && shown(r3[0]).length > 0, "each page gets some of the story");
ok(r1[0].storyNextPage === 1 && r2[0].storyPrevPage === 0 && r2[0].storyNextPage === 2 && r3[0].storyNextPage === undefined, "each frame knows which page the story goes on to");
ok(resolvePageText(pages[1].annotations, pages) === r2, "cached per document");

// Registered document: no second argument needed.
setTextDocument(pages);
ok(resolvePageText(pages[2].annotations) === r3, "the registered document is used when none is given");

// Editing the head's text moves the words on later pages.
const longer = [{ ...pages[0], annotations: [{ ...f1, text: words + " extra1 extra2" }] }, pages[1], pages[2]];
const l3 = resolvePageText(longer[2].annotations, longer);
ok(shown(l3[0]).includes("extra2"), "more text at the start reaches the last page");

// State of the pages (for the page icons).
const small = { ...f3, frameHeight: 12 };
const smallPages = [pages[0], pages[1], { key: 3, annotations: [small] }];
const st = storyStateOfPages(smallPages);
ok(st[0].continues === 1 && st[1].continues === 2 && st[2].continues === null, "pages whose story goes on show where");
ok(st[2].overflows === true && st[0].overflows === false, "only the last frame can be overset");
const fine = storyStateOfPages(pages);
ok(fine[2].overflows === false, "a last frame that holds the rest is not overset");

// A page with no threads is returned as it is; a copy list (a preview) is resolved by itself.
const plain = { key: 9, annotations: [{ id: 50, type: "text", text: "hi", x: 0, y: 0, fontSize: 10 }] };
ok(resolvePageText(plain.annotations, [plain]) === plain.annotations, "a page with no thread or wrap comes back unchanged");
const copy = pages[1].annotations.slice();
ok(resolvePageText(copy, pages)[0].storyHeadId === undefined && resolvePageText(copy, pages)[0].text === "", "a copy of a page's list is not part of the document (resolved alone)");

// A follower pointing at a missing frame is an ordinary empty box.
const orphan = [{ key: 1, annotations: [{ ...f2, threadFrom: 999 }] }];
ok(resolvePageText(orphan[0].annotations, orphan)[0].storyHeadId === undefined, "a follower whose previous frame is gone behaves as an ordinary box");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

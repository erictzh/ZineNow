// Editing through a follower frame on a later page (render/storyEdits.js): the words land on the story's head.
import { patchedPages } from "../apps/ZEditor/src/render/storyEdits.js";
import { resolvePageText } from "../apps/ZEditor/src/render/pageText.js";
import { removeFromPages, removePagesKeepingStories } from "../apps/ZEditor/src/model/text/threads.js";
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
const words = Array.from({ length: 60 }, (_, i) => "w" + i).join(" ");
const mk = () => [
  { key: 1, annotations: [{ id: 1, type: "text", text: words, x: 0, y: 0, width: 120, frameHeight: 40, fontSize: 10 }] },
  { key: 2, annotations: [{ id: 2, type: "text", text: "", x: 5, y: 5, width: 120, frameHeight: 40, threadFrom: 1 }] },
  { key: 3, annotations: [{ id: 3, type: "text", text: "", x: 9, y: 9, width: 120, frameHeight: 40, threadFrom: 2 }] },
];
const merge = (a, p) => ({ ...a, ...p });

// A look change on a later frame goes to the head (on page 1); a frame setting stays on the frame.
let pages = mk();
let out = patchedPages(pages, 2, 3, { fontSize: 14, x: 77 }, merge);
ok(out[0].annotations[0].fontSize === 14 && out[2].annotations[0].x === 77 && out[2].annotations[0].fontSize === undefined, "the look lands on the head (page 1), the position on the frame (page 3)");
ok(out[1] === pages[1], "a page the change does not touch is kept as it was");

// Typing in a later frame changes the story's text from where that frame begins.
const shownOnPage2 = resolvePageText(pages[1].annotations, pages)[0];
const typed = patchedPages(pages, 1, 2, { text: shownOnPage2.text + " TYPED" }, merge);
ok(typed[0].annotations[0].text.endsWith(" TYPED") && typed[0].annotations[0].text.startsWith("w0 w1"), "text typed on page 2 is added to the story kept on page 1");

// A frame that is not part of a story is patched on its own page.
const alone = [{ key: 1, annotations: [{ id: 7, type: "text", text: "x", x: 0, y: 0 }] }];
ok(patchedPages(alone, 0, 7, { x: 5 }, merge)[0].annotations[0].x === 5, "an ordinary box is patched where it is");

// Deleting a frame in the middle: the frames around it link up, across pages.
const mid = removeFromPages(mk(), [2]);
ok(mid[1].annotations.length === 0 && mid[2].annotations[0].threadFrom === 1, "deleting the middle frame links the last frame to the first");
const head = removeFromPages(mk(), [1]);
ok(head[1].annotations[0].threadFrom === undefined && head[1].annotations[0].text === words, "deleting the head: the next frame (page 2) takes the story");
const none = removeFromPages(mk(), [999]);
ok(none.every((p, i) => p === mk()[i] || p.annotations.length === 1), "deleting an id nobody has changes nothing");

// Deleting a page: the story carries on across the gap, and the other pages are untouched.
const gone = removePagesKeepingStories(mk(), [1]);
ok(gone.length === 2 && gone[1].annotations[0].threadFrom === 1, "deleting page 2: page 3's frame now follows page 1's");
const goneHead = removePagesKeepingStories(mk(), [0]);
ok(goneHead.length === 2 && goneHead[0].annotations[0].text === words && goneHead[0].annotations[0].threadFrom === undefined, "deleting the first page: the next frame becomes the head with the whole story");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

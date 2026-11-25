// A layout turned into items (render/layoutItems.js), through the real text layout with a fake canvas (letters 0.5 em wide).
import { buildLayoutItems, fitTextToFrame } from "../apps/ZEditor/src/render/layoutItems.js";
import { DEFAULT_LAYOUT_SETTINGS, LAYOUTS, layoutByKey } from "../apps/ZEditor/src/model/pageLayouts.js";
import { measureTextBox } from "../apps/ZEditor/src/render/textLayout.js";
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
const defaults = { textFontFamily: "Georgia", textFontSize: 12, textBold: false, textItalic: false, textUnderline: false, textColor: "#1a1a1a", textAlign: "left" };
const page = { width: 461.7, height: 655 };
let id = 100;
const build = (key, settings = DEFAULT_LAYOUT_SETTINGS) => buildLayoutItems({ layout: layoutByKey(key), page, settings, defaults, guide: null, nextId: () => id++ });

const all = LAYOUTS.map((l) => [l.key, build(l.key)]);
ok(all.every(([, items]) => items.length >= 1 && items.every((a) => Number.isFinite(a.x) && Number.isFinite(a.y) && a.id >= 100)), "every layout makes items with real positions and new ids");
ok(new Set(all.flatMap(([, items]) => items.map((a) => a.id))).size === all.reduce((n, [, i]) => n + i.length, 0), "every item gets its own id");

const top = build("picture-top");
ok(top[0].type === "rect" && top[0].fillColor === "#d9d9d9" && top[0].layoutRole === "picture" && top[1].type === "text" && top[1].layoutRole === "body", "a picture is a plain grey rectangle; the body is a text frame");
ok(top[1].text.length > 100 && top[1].text.startsWith("Lorem ipsum"), "the body is filled with lorem ipsum");
ok(!measureTextBox(top[1]).overflow, "the lorem ipsum fits its frame: no overset warning");
ok(top[1].frameHeight > 0 && top[1].width > 0, "the body is a fixed frame (width and height set)");

const cols = build("two-columns")[0];
ok(cols.columns === 2 && cols.columnGap === 12 && !measureTextBox(cols).overflow, "the two-column body has 2 columns and also fits");
const tt = build("title-text");
ok(tt[0].layoutRole === "title" && tt[0].fontSize === 30 && tt[0].bold && tt[1].fontSize === 12, "the title is body size x 2.5 and bold; the body keeps the text tool's size");
ok(tt[0].fontFamily === "Georgia" && tt[1].color === "#1a1a1a", "text uses the text tool's font and colour");
const cap = build("picture-caption");
ok(cap[1].layoutRole === "caption" && cap[1].fontSize === 10.2 && !measureTextBox(cap[1]).overflow, "the caption is smaller and fits its two lines");
const cover = build("cover");
ok(cover[0].type === "rect" && cover[1].type === "text", "the cover has the picture first, the title above it");

const small = build("full-text", { ...DEFAULT_LAYOUT_SETTINGS, marginPct: 30 })[0];
const big = build("full-text")[0];
ok(small.text.length < big.text.length && small.width < big.width, "bigger margins give a smaller box with less text");

// fitTextToFrame on its own: it cuts at the frame's end and never overflows.
const frame = { id: 1, type: "text", x: 0, y: 0, width: 120, frameHeight: 40, fontSize: 10 };
const words = Array.from({ length: 200 }, (_, i) => "w" + i).join(" ");
const fit = fitTextToFrame({ ...frame, text: words });
ok(fit.length > 0 && fit.length < words.length && words.startsWith(fit) && !measureTextBox({ ...frame, text: fit }).overflow, "the text is cut where the frame ends and fits");
const few = fitTextToFrame({ ...frame, text: "just a few words" });
ok(few === "just a few words", "text that already fits is left alone");
console.log(fails ? "\n" + fails + " FAILED" : "\nall passed");
process.exit(fails ? 1 : 0);

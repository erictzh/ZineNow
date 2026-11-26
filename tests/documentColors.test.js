// The colours a document uses (model/documentColors.js).
import { collectDocumentColors } from "../apps/ZEditor/src/model/documentColors.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const pages = [
  { annotations: [
    { id: 1, type: "text", color: "#1A1A1A", colorRuns: [{ start: 0, end: 3, color: "#e63946" }], src: "data:image/png;base64,#abcdef" },
    { id: 2, type: "rect", fillColor: "#e63946", strokeColor: "#1a1a1a", fillAlpha: 100, name: "#123456 not a colour field? it is text" },
  ] },
  { annotations: [{ id: 3, type: "trace", paths: [{ color: "#ffd400", d: "M0 0" }, { color: "#e63946", d: "M1 1" }], filter: { darkColor: "#000000" } }] },
];
const c = collectDocumentColors(pages);
ok(c[0] === "#e63946" && c[1] === "#1a1a1a", "most used colours come first, upper and lower case counted together");
ok(c.includes("#ffd400") && c.includes("#000000"), "colours inside paths and filters are found");
ok(!c.includes("#abcdef"), "a colour inside a longer text is not a colour");
ok(c.length === new Set(c).size, "each colour once");
ok(collectDocumentColors([], 5).length === 0 && collectDocumentColors(null).length === 0, "no pages, no colours");
const many = [{ annotations: Array.from({ length: 30 }, (_, i) => ({ color: "#" + String(100000 + i * 11111).slice(0, 6).padStart(6, "0") })) }];
ok(collectDocumentColors(many, 12).length === 12, "limited to the number asked for");
if (fails) { console.log(fails + " failed"); process.exit(1); }

// File names for pages exported as pictures (model/documentTitle.js).
import { pageImageFileName } from "../apps/ZEditor/src/model/documentTitle.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(pageImageFileName("Issue 3", 0, 1, ".png") === "Issue 3.png", "a one-page zine has no page number in the name");
ok(pageImageFileName("Issue 3", 1, 8, ".jpg") === "Issue 3-page-2.jpg", "pages are numbered from 1");
ok(pageImageFileName("Issue 3", 1, 12, ".jpg") === "Issue 3-page-02.jpg" && pageImageFileName("Issue 3", 11, 12, ".jpg") === "Issue 3-page-12.jpg", "page numbers are padded so the files sort in order");
ok(pageImageFileName("Summer: #1?", 0, 3, ".png") === "Summer #1-page-1.png", "forbidden characters are dropped from the title");
ok(pageImageFileName("", 0, 2, ".png") === "zine-page-1.png", "an empty title falls back to 'zine'");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

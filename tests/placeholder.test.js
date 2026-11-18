// Placeholder text (model/text/placeholderText.js).
import { placeholderText } from "../apps/ZEditor/src/model/text/placeholderText.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const latin = placeholderText("latin", 3);
ok(latin.split("\n").length === 3, "three Latin paragraphs, one per line");
ok(latin.startsWith("Lorem ipsum dolor sit amet"), "Latin starts with the classic opening");
ok(placeholderText("latin", 3) === latin, "the same count gives the same text");
const zh = placeholderText("chinese", 4);
ok(zh.split("\n").length === 4 && /^[一-鿿，。？\n]+$/.test(zh), "four Chinese paragraphs of Chinese characters and punctuation");
ok(placeholderText("latin", 0).split("\n").length === 1 && placeholderText("latin", 999).split("\n").length === 50, "the count is kept between 1 and 50");

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); } else console.log("all passed");

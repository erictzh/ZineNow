// Hidden pages (model/pageVisibility.js) and how they change the page numbers.
import { isHiddenPage, visibleIndices, visibleSlot } from "../apps/ZEditor/src/model/pageVisibility.js";
import { pageNumberSpec, DEFAULT_PAGE_NUMBERS } from "../apps/ZEditor/src/model/pageNumbers.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

const pages = [{}, { hidden: true }, {}, {}, { hidden: true }, {}];
ok(isHiddenPage(pages[1]) && !isHiddenPage(pages[0]) && !isHiddenPage(null), "a page is hidden when marked");
ok(visibleIndices(pages).join() === "0,2,3,5", "the visible pages, in order");
ok(JSON.stringify(visibleSlot(pages, 0)) === '{"index":0,"count":4}' && JSON.stringify(visibleSlot(pages, 5)) === '{"index":3,"count":4}', "a visible page's place among the visible ones");
ok(visibleSlot(pages, 1) === null && visibleSlot(pages, null) === null && visibleSlot(pages, 99) === null, "a hidden page, no page or a missing page has no place");
const settings = { ...DEFAULT_PAGE_NUMBERS, on: true };
const slot = visibleSlot(pages, 3);
const spec = pageNumberSpec(settings, slot.index, slot.count);
ok(spec && spec.text === String(settings.first + 2), "the numbers skip hidden pages: page 4 of 6 is the 3rd visible one");
ok(visibleIndices([{ hidden: true }, { hidden: true }]).length === 0, "all hidden leaves nothing to export");
if (fails) { console.log(fails + " failed"); process.exit(1); }

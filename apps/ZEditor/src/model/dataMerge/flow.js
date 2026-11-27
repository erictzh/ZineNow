// Letters and other records whose text can run onto a second page (data merge). Pure; the measuring is passed in (render/textFit.js fitLength).
//
// A text box marked `flowText: true` is the long text. For each record its text is filled, then cut where the box is full: the first part stays
// on the page made from the designed page, the rest goes into the long-text box of the continuation design (or the designed page again when
// there is none), and so on until it all fits. The cut parts are plain text on ordinary pages. Items on the page see the record's page counters
// ({{page in group}} and {{pages in group}}) and obey Show on, like the pages of a group.

import { fillTemplate } from "./fields.js";
import { fillItem, remapItems } from "./build.js";
import { showsOnPage } from "./groups.js";

export const MAX_FLOW_PAGES = 30;
const isFlowBox = (a) => a.type === "text" && a.flowText;

// The long-text box of a page (the first marked one), or null.
export const flowBoxOf = (annotations) => (annotations || []).find(isFlowBox) || null;

// A text cut into the parts that fit page after page. `fits(partIndex, rest)` says how many characters of `rest` fit on page `partIndex` (0 =
// the first). A part that fits nothing is not retried forever: the rest goes in whole (and `cut` is true).
export function splitFlowText(text, fits, maxPages = MAX_FLOW_PAGES) {
  const parts = [];
  let rest = text, cut = false;
  while (parts.length < maxPages) {
    const n = fits(parts.length, rest);
    if (n >= rest.length) { parts.push(rest); return { parts, cut }; }
    if (n <= 0) { parts.push(rest); return { parts, cut: true }; }
    parts.push(rest.slice(0, n).replace(/\s+$/, ""));
    rest = rest.slice(n).replace(/^[ \t]*\n?/, "").replace(/^\s+/, "");
    if (!rest) return { parts, cut };
  }
  parts[parts.length - 1] += rest; // too many pages: the last one carries the rest (it will not all show)
  return { parts, cut: true };
}

// The pages for the records: [{ record, pageInGroup, pagesInGroup, design, flowText, recordNo }] (`recordNo`: 1-based place in the list).
// `first`/`next`: the designed page's and the continuation design's items (`next` null: reuse the first). `fit(box, text)`: characters that fit.
export function planFlowPages(records, first, next, fit, lang) {
  const firstBox = flowBoxOf(first), nextBox = (next && flowBoxOf(next)) || firstBox;
  const plans = [];
  records.forEach((record, i) => {
    const full = firstBox ? fillTemplate(firstBox.text || "", record, { lang }).text : "";
    const { parts } = splitFlowText(full, (k, rest) => fit(k === 0 ? firstBox : nextBox, rest));
    parts.forEach((part, k) => plans.push({ record, recordNo: i + 1, pageInGroup: k + 1, pagesInGroup: parts.length, design: k === 0 ? "first" : "continuation", flowText: part }));
  });
  return plans;
}

// One made page: the design's items filled for the record (counters added), the long-text box holding this page's part, items left out where
// Show on says. Returns { annotations, missing }.
export function mergeFlowPage(annotations, plan, { newId, newGroupId, lang, repeatOthers, findPhoto, makeQr } = {}) {
  const vars = { ...plan.record, "page in group": String(plan.pageInGroup), "pages in group": String(plan.pagesInGroup), "records in group": "1" };
  const flowId = (flowBoxOf(annotations) || {}).id;
  const chosen = [], missing = [];
  for (const a of annotations) {
    if (a.id === flowId) { chosen.push({ ...a, text: plan.flowText, colorRuns: undefined }); continue; }
    if (!showsOnPage(a.showOn, plan, repeatOthers)) continue;
    const filled = fillItem(a, vars, { lang, findPhoto, makeQr });
    for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
    if (filled.ann) chosen.push(filled.ann);
  }
  return { annotations: remapItems(chosen, newId, newGroupId), missing };
}

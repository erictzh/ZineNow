// Building merged pages from a template page and a record, for the data merge. Pure.

import { fieldsIn, fillTemplate } from "./fields.js";

// The fields a page's text boxes use, in order of first use, each once.
export function fieldsUsedOnPage(annotations) {
  const out = [];
  for (const a of annotations || []) {
    if (a.type !== "text" || !a.text) continue;
    for (const f of fieldsIn(a.text)) if (!out.includes(f)) out.push(f);
  }
  return out;
}

// A text box's text with the record's values put in. A box with no field is returned as it is. If the new text is a different length, custom
// letter-by-letter styling (colorRuns) no longer lines up with it and is dropped.
export function fillTextItem(ann, record, options) {
  if (ann.type !== "text" || !ann.text || !ann.text.includes("{{")) return { ann, result: null };
  const result = fillTemplate(ann.text, record, options);
  if (result.text === ann.text) return { ann, result };
  const filled = { ...ann, text: result.text };
  if (filled.colorRuns && filled.colorRuns.length) filled.colorRuns = undefined;
  return { ann: filled, result };
}

// The items of a template page filled for one record, as new items: every item gets a new id (`newId()`), groups a new group id
// (`newGroupId()`), and links to other items on the page (threaded text) follow the new ids. Returns { annotations, problems } where problems
// lists fields the text asks for that the data does not have.
export function mergeAnnotations(annotations, record, { newId, newGroupId, lang } = {}) {
  const ids = new Map(), groups = new Map();
  for (const a of annotations) ids.set(a.id, newId());
  const missing = [];
  const out = annotations.map((a) => {
    const { ann, result } = fillTextItem(a, record, { lang });
    if (result) for (const f of result.missing) if (!missing.includes(f)) missing.push(f);
    const copy = { ...ann, id: ids.get(a.id) };
    if (copy.groupId) {
      if (!groups.has(copy.groupId)) groups.set(copy.groupId, newGroupId());
      copy.groupId = groups.get(copy.groupId);
    }
    if (copy.threadFrom != null && ids.has(copy.threadFrom)) copy.threadFrom = ids.get(copy.threadFrom);
    return copy;
  });
  return { annotations: out, missing };
}

// What to tell the person before merging: fields the text asks for that the file has no column for, and how many of the chosen records have
// an empty cell in a field that is used.
export function checkMerge(annotations, headers, records) {
  const used = fieldsUsedOnPage(annotations);
  const missing = used.filter((f) => !headers.includes(f));
  const emptyCounts = used.filter((f) => headers.includes(f)).map((f) => ({ field: f, count: records.filter((r) => String(r[f] === undefined ? "" : r[f]).trim() === "").length })).filter((e) => e.count > 0);
  return { used, missing, emptyCounts };
}

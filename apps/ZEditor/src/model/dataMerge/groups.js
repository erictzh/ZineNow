// Data blocks and group pages for the data merge (Advanced). Pure.
//
// A DATA BLOCK is a group of items on the designed page marked `dataBlock: true`: it shows one record, and the page holds several of them (the
// "slots"). Everything else on the page is a NON-DATA ITEM; it may carry `showOn` ("every" | "first" | "continuation" | "last") to say which pages
// of a group it appears on. The records can be grouped by a column ("Group by"): each group gets its own pages, filled slot by slot.

import { fillTextItem } from "./build.js";

export const SHOW_ON = [
  { key: "every", label: "Every page" },
  { key: "first", label: "First page of the group" },
  { key: "continuation", label: "Continuation pages only" },
  { key: "last", label: "Last page only" },
];

const slotKey = (a) => a.groupId || "i" + a.id;
const ROW_TOLERANCE = 15; // blocks whose tops are this close (editor pixels) are on the same row

// The data blocks of a page in the order records fill them: rows from the top, each left to right. Returns their keys.
export function dataSlots(annotations) {
  const found = new Map();
  for (const a of annotations || []) {
    if (!a.dataBlock) continue;
    const key = slotKey(a), x = Number(a.x) || 0, y = Number(a.y) || 0;
    const have = found.get(key);
    if (!have) found.set(key, { key, x, y });
    else { have.x = Math.min(have.x, x); have.y = Math.min(have.y, y); }
  }
  const list = [...found.values()].sort((p, q) => p.y - q.y || p.x - q.x);
  const rows = [];
  for (const item of list) {
    const row = rows[rows.length - 1];
    if (row && item.y - row.y <= ROW_TOLERANCE) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows.flatMap((r) => r.items.sort((p, q) => p.x - q.x)).map((i) => i.key);
}

// Records in groups by the value in `column` (none: one group of everything). Groups keep the order their first record appears in.
export function groupRecords(records, column) {
  if (!column) return [{ value: "", records }];
  const groups = new Map();
  for (const r of records) {
    const value = String(r[column] === undefined ? "" : r[column]).trim();
    if (!groups.has(value)) groups.set(value, { value, records: [] });
    groups.get(value).records.push(r);
  }
  return [...groups.values()];
}

// The pages a merge makes: [{ groupValue, groupRecord, recordsInGroup, pageInGroup, pagesInGroup, slotRecords }]. `slotRecords` has one entry per
// slot (null where a last page runs short). A group of 10 with 5 slots makes 2 pages.
export function planPages(records, { slotCount, groupBy }) {
  const slots = Math.max(1, slotCount || 1);
  const pages = [];
  for (const group of groupRecords(records, groupBy)) {
    if (!group.records.length) continue;
    const count = Math.max(1, Math.ceil(group.records.length / slots));
    for (let p = 0; p < count; p++) {
      const slice = group.records.slice(p * slots, (p + 1) * slots);
      pages.push({
        groupValue: group.value, groupRecord: group.records[0], recordsInGroup: group.records.length,
        pageInGroup: p + 1, pagesInGroup: count,
        slotRecords: Array.from({ length: slots }, (_, k) => slice[k] || null),
      });
    }
  }
  return pages;
}

// Does a non-data item show on this page of its group? Without its own Show on it follows `repeatOthers` (every page, or the first only).
export function showsOnPage(showOn, plan, repeatOthers) {
  const first = plan.pageInGroup === 1, last = plan.pageInGroup === plan.pagesInGroup;
  if (showOn === "first") return first;
  if (showOn === "continuation") return !first;
  if (showOn === "last") return last;
  if (showOn === "every") return true;
  return repeatOthers !== false || first;
}

// One made page: the designed page's items, data blocks filled from their slot's record (an empty slot is left out), the rest from the group's
// first record plus the page counters, and skipped where Show on says. New ids as in mergeAnnotations.
export function mergeGroupPage(annotations, plan, { newId, newGroupId, lang, repeatOthers } = {}) {
  const slots = dataSlots(annotations);
  const vars = { ...plan.groupRecord, "page in group": String(plan.pageInGroup), "pages in group": String(plan.pagesInGroup), "records in group": String(plan.recordsInGroup) };
  const chosen = [];
  const missing = [];
  for (const a of annotations) {
    let record = vars;
    if (a.dataBlock) {
      record = plan.slotRecords[slots.indexOf(slotKey(a))];
      if (!record) continue;
    } else if (!showsOnPage(a.showOn, plan, repeatOthers)) continue;
    const { ann, result } = fillTextItem(a, record, { lang });
    if (result) for (const f of result.missing) if (!missing.includes(f)) missing.push(f);
    chosen.push(ann);
  }
  const ids = new Map(), groups = new Map();
  for (const a of chosen) ids.set(a.id, newId());
  const out = chosen.map((a) => {
    const copy = { ...a, id: ids.get(a.id), dataBlock: undefined, showOn: undefined };
    if (copy.groupId) {
      if (!groups.has(copy.groupId)) groups.set(copy.groupId, newGroupId());
      copy.groupId = groups.get(copy.groupId);
    }
    if (copy.threadFrom != null) copy.threadFrom = ids.has(copy.threadFrom) ? ids.get(copy.threadFrom) : undefined;
    return copy;
  });
  return { annotations: out, missing };
}

// The designed page as the preview shows it: data blocks show the records from `start` on, one per slot (empty slots hidden), other text shows
// the record at `start`. The item being typed in is left alone.
export function previewAnnotations(annotations, records, start, editingId, lang) {
  const slots = dataSlots(annotations);
  const counters = { ...records[start], "page in group": "1", "pages in group": "1", "records in group": String(records.length) };
  return annotations.map((a) => {
    if (a.id === editingId) return a;
    if (a.dataBlock) {
      const record = records[start + slots.indexOf(slotKey(a))];
      return record ? fillTextItem(a, record, { lang }).ann : { ...a, hidden: true };
    }
    return fillTextItem(a, counters, { lang }).ann;
  });
}

// Data blocks and group pages for the data merge (Advanced). Pure.
//
// A DATA BLOCK is a group of items on the designed page marked `dataBlock: true`: it shows one record, and the page holds several of them (the
// "slots"). Everything else on the page is a NON-DATA ITEM; it may carry `showOn` ("every" | "first" | "continuation" | "last") to say which pages
// of a group it appears on. The records can be grouped by a column ("Group by"): each group gets its own pages, filled slot by slot.

import { translatedAnnotation } from "../annotations.js";
import { fillItem, fillTextItem, remapItems } from "./build.js";

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

// The pages a merge makes: [{ groupValue, groupRecord, recordsInGroup, pageInGroup, pagesInGroup, design, slotRecords }]. `slotRecords` has one entry
// per slot of the page's design (null where a last page runs short). The first page of a group uses the first design (`slotCount` slots); later
// pages use the continuation design (`nextSlotCount` slots, default the same): a group of 14 with 5 and 6 slots makes pages of 5, 6 and 3.
// `design` is "first" or "continuation".
export function planPages(records, { slotCount, nextSlotCount, groupBy }) {
  const first = Math.max(1, slotCount || 1);
  const next = Math.max(1, nextSlotCount || first);
  const pages = [];
  for (const group of groupRecords(records, groupBy)) {
    if (!group.records.length) continue;
    const slices = [];
    let rest = group.records;
    do {
      const cap = slices.length === 0 ? first : next;
      slices.push({ cap, records: rest.slice(0, cap) });
      rest = rest.slice(cap);
    } while (rest.length);
    slices.forEach((slice, i) => pages.push({
      groupValue: group.value, groupRecord: group.records[0], recordsInGroup: group.records.length,
      pageInGroup: i + 1, pagesInGroup: slices.length, design: i === 0 ? "first" : "continuation",
      slotRecords: Array.from({ length: slice.cap }, (_, k) => slice.records[k] || null),
    }));
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
export function mergeGroupPage(annotations, plan, { newId, newGroupId, lang, repeatOthers, findPhoto, makeQr } = {}) {
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
    const filled = fillItem(a, record, { lang, findPhoto, makeQr });
    for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
    if (filled.ann) chosen.push(filled.ann);
  }
  return { annotations: remapItems(chosen, newId, newGroupId), missing };
}

// The designed page as the preview shows it: data blocks show the records from `start` on, one per slot (empty slots hidden), other text shows
// the record at `start`. The item being typed in is left alone.
export function previewAnnotations(annotations, records, start, editingId, lang, findPhoto, makeQr) {
  const slots = dataSlots(annotations);
  const counters = { ...records[start], "page in group": "1", "pages in group": "1", "records in group": String(records.length) };
  return annotations.map((a) => {
    if (a.id === editingId) return a;
    const record = a.dataBlock ? records[start + slots.indexOf(slotKey(a))] : counters;
    if (!record) return { ...a, hidden: true };
    if (a.type === "image" && (a.picField || a.qrText)) {
      const filled = fillItem(a, record, { findPhoto, makeQr, lang });
      return filled.ann || { ...a, hidden: true };
    }
    return fillTextItem(a, record, { lang }).ann;
  });
}

// A ready-made sheet (model/dataMerge/layout.js GRID_PRESETS, in mm) in pixels: `k` is pixels per mm. Gives where the first cell starts, the
// distance from one cell to the next (cell plus gap), the cell size, and how many fit.
export function sheetGrid(preset, k) {
  return {
    origin: { x: preset.origin.x * k, y: preset.origin.y * k },
    pitch: { x: (preset.cell.w + preset.gap.x) * k, y: (preset.cell.h + preset.gap.y) * k },
    cell: { w: preset.cell.w * k, h: preset.cell.h * k },
    cols: preset.cols, rows: preset.rows,
  };
}

// A page's items duplicated as they are (new ids, groups kept as new groups, data block and Show on markers kept): for a copy of the designed
// page, such as the continuation design.
export function cloneItems(items, newId, newGroupId) {
  const ids = new Map(), groups = new Map();
  for (const a of items) ids.set(a.id, newId());
  return items.map((a) => {
    const copy = { ...a, id: ids.get(a.id) };
    if (copy.groupId) {
      if (!groups.has(copy.groupId)) groups.set(copy.groupId, newGroupId());
      copy.groupId = groups.get(copy.groupId);
    }
    if (copy.threadFrom != null) copy.threadFrom = ids.has(copy.threadFrom) ? ids.get(copy.threadFrom) : undefined;
    return copy;
  });
}

// Copies of a data block laid out as a grid: `items` are the block's items and `bounds` the box they cover ({ x, y, width, height }). The block
// itself stays in the top-left cell; the copies fill the rest of `cols` x `rows`, `gap` ({ x, y }) apart (or exactly `pitch` apart, a sheet's
// cell-to-cell distance), each a new group. Returns the new items, and how many of the grid's blocks end up outside `page` ({ width, height }).
export function gridCopies(items, bounds, { cols, rows, gap, pitch }, { newId, newGroupId }, page) {
  const out = [];
  let outside = 0;
  const step = pitch || { x: bounds.width + gap.x, y: bounds.height + gap.y };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = col * step.x, dy = row * step.y;
      if (page && (bounds.x + dx + bounds.width > page.width + 0.5 || bounds.y + dy + bounds.height > page.height + 0.5)) outside++;
      if (col === 0 && row === 0) continue;
      const groupId = newGroupId();
      for (const a of items) out.push({ ...translatedAnnotation(a, dx, dy), id: newId(), groupId, dataBlock: true });
    }
  }
  return { items: out, outside };
}

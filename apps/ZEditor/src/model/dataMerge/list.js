// Flowing lists for the data merge: entries of different heights stacked down an area, a new page when the next one does not fit. Pure; the
// measuring of text is passed in (render/textFit.js).
//
// On the designed page: one group marked `listEntry: true` on its items is the ENTRY, one rectangle marked `listArea: true` is the AREA the list
// may flow in (it is not drawn on the made pages). Text boxes in the entry that have no fixed height grow with each record's text, and the items
// below them (and overlapping them sideways) move down by the growth; the entry's height follows. The continuation design, if any, has its own
// entry and area for pages 2 onward.

import { fillItem, remapItems } from "./build.js";
import { showsOnPage } from "./groups.js";

export const hasListDesign = (annotations) => (annotations || []).some((a) => a.listEntry) && (annotations || []).some((a) => a.listArea);
export const listAreaOf = (annotations) => (annotations || []).find((a) => a.listArea) || null;
export const listEntryItems = (annotations) => (annotations || []).filter((a) => a.listEntry);

const overlapsX = (a, b) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5;

// How an entry looks for one record. `boxes`: the entry's items as designed [{ id, x, y, width, height, grows }]; `newHeights`: Map id -> the
// height a growing text box has with this record's text. Returns { shifts: Map id -> pixels down, height, top }.
export function layoutEntry(boxes, newHeights) {
  const sorted = boxes.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const shift = new Map(), delta = new Map();
  for (const b of sorted) {
    let s = null;
    for (const a of sorted) {
      if (a === b || shift.get(a.id) === undefined) continue;
      if (b.y >= a.y + a.height / 2 && b.y > a.y && overlapsX(a, b)) // b starts below the middle of a (text boxes padded close together still count as stacked)
         s = Math.max(s === null ? -Infinity : s, shift.get(a.id) + delta.get(a.id));
    }
    shift.set(b.id, s === null ? 0 : s);
    delta.set(b.id, b.grows && newHeights.has(b.id) ? newHeights.get(b.id) - b.height : 0);
  }
  const top = Math.min(...boxes.map((b) => b.y));
  const bottom = Math.max(...boxes.map((b) => b.y + shift.get(b.id) + b.height + delta.get(b.id)));
  return { shifts: shift, height: bottom - top, top };
}

// Stacks entries down pages. `heightFor(design, i)`: the height of entry i when its page uses design 0 (the first) or 1 (the continuation);
// `areaFirst` and `areaNext`: the heights of the area on the first page and on later pages; `gap`: space between entries. An entry never splits:
// one taller than the whole area gets a page of its own (and the page is marked `overflow`). Returns [{ design, entries: [{ index, y, height }], overflow }].
export function packList({ count, heightFor, areaFirst, areaNext, gap }) {
  const pages = [];
  let cur = null;
  const start = () => { cur = { design: pages.length === 0 ? "first" : "continuation", area: pages.length === 0 ? areaFirst : areaNext, entries: [], y: 0, overflow: false }; pages.push(cur); };
  for (let i = 0; i < count; i++) {
    if (!cur) start();
    let h = heightFor(pages.length === 1 ? 0 : 1, i);
    if (cur.entries.length > 0 && cur.y + gap + h > cur.area + 0.5) { start(); h = heightFor(1, i); }
    const y = cur.entries.length ? cur.y + gap : 0;
    cur.entries.push({ index: i, y, height: h });
    cur.y = y + h;
    if (h > cur.area + 0.5) cur.overflow = true;
  }
  return pages.map(({ design, entries, overflow }) => ({ design, entries, overflow }));
}

// One made page. `page`: { design, pageInGroup, pagesInGroup, recordsInGroup, groupRecord, entries: [{ record, y, shifts }] }. The designed page's items
// are filled for the group's first record (page counters added) except the entry and the area; each entry is a copy of the entry's items, filled for
// its record and moved to its place in the area (from the area's top, each item's shift added). The area itself is left out.
export function buildListPage(annotations, page, { newId, newGroupId, lang, repeatOthers, findPhoto, makeQr } = {}) {
  const area = listAreaOf(annotations);
  const entry = listEntryItems(annotations);
  const entryTop = Math.min(...entry.map((a) => a.y));
  const vars = { ...page.groupRecord, "page in group": String(page.pageInGroup), "pages in group": String(page.pagesInGroup), "records in group": String(page.recordsInGroup) };
  const out = [], missing = [];
  let entriesDone = false;
  const placeEntries = () => {
    if (entriesDone) return;
    entriesDone = true;
    for (const e of page.entries) {
      const items = [];
      for (const a of entry) {
        const filled = fillItem(a, e.record, { lang, findPhoto, makeQr });
        for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
        if (filled.ann) items.push({ ...filled.ann, y: area.y + e.y + (a.y - entryTop) + (e.shifts.get(a.id) || 0), listEntry: undefined });
      }
      out.push(...remapItems(items, newId, newGroupId));
    }
  };
  const others = [];
  for (const a of annotations) {
    if (a.listArea) continue;
    if (a.listEntry) { others.push({ place: true }); continue; }
    if (!showsOnPage(a.showOn, page, repeatOthers)) continue;
    const filled = fillItem(a, vars, { lang, findPhoto, makeQr });
    for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
    if (filled.ann) others.push({ ann: filled.ann });
  }
  // the entries go where the first entry item was in the stacking order; the other items keep theirs
  let pending = [];
  for (const o of others) {
    if (o.place) { if (pending.length) { out.push(...remapItems(pending, newId, newGroupId)); pending = []; } placeEntries(); } else pending.push(o.ann);
  }
  if (pending.length) out.push(...remapItems(pending, newId, newGroupId));
  placeEntries();
  return { annotations: out, missing };
}

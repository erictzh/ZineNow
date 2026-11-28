// Cards or labels on a sheet (data merge). Pure.
//
// The designed page is a SHEET: its `dataSheet` names a ready-made sheet (GRID_PRESETS in layout.js), and a rectangle marked `sheetCell: true` is the
// first cell. The items whose middle is inside that rectangle are the CARD. Making pages repeats the card in every cell of the sheet, each with the
// next row, so the person designs one card and never copies or places anything. A last sheet that runs short leaves its cells empty.

import { fillItem, remapItems } from "./build.js";
import { showsOnPage } from "./groups.js";

export const sheetCellOf = (annotations) => (annotations || []).find((a) => a.sheetCell && a.type === "rect") || null;

const centerInside = (a, cell) => {
  const w = a.width || 0, h = a.height || 0;
  const cx = a.x + w / 2, cy = a.y + h / 2;
  return cx >= cell.x && cx <= cell.x + cell.width && cy >= cell.y && cy <= cell.y + cell.height;
};

// The card's items (everything but the cell rectangle whose middle is inside it) and the page's other items.
export function splitSheet(annotations) {
  const cell = sheetCellOf(annotations);
  if (!cell) return { cell: null, card: [], others: annotations || [] };
  const card = [], others = [];
  for (const a of annotations) {
    if (a === cell) continue;
    (centerInside(a, cell) ? card : others).push(a);
  }
  return { cell, card, others };
}

// Where each cell of a sheet is from the first, in pixels: [{ dx, dy }] in reading order. `k`: pixels per mm.
export function cellOffsets(preset, k) {
  const out = [];
  for (let row = 0; row < preset.rows; row++) for (let col = 0; col < preset.cols; col++) out.push({ dx: col * (preset.cell.w + preset.gap.x) * k, dy: row * (preset.cell.h + preset.gap.y) * k });
  return out;
}

const moved = (a, dx, dy) => {
  if (a.type === "stroke") return { ...a, points: a.points.map(([px, py]) => [px + dx, py + dy]) };
  return { ...a, x: a.x + dx, y: a.y + dy };
};

// One made sheet. `plan`: { slotRecords (one per cell, null where empty), groupRecord, pageInGroup, pagesInGroup, recordsInGroup }. The page's other items
// are filled from the first row (page counters added) and obey Show on; the cards go where the first card item was in the stacking order. With
// `drawOutline` each cell's rectangle stays under its card (for cutting), otherwise it is left out.
export function mergeSheetPage(annotations, plan, { offsets, drawOutline, newId, newGroupId, lang, repeatOthers, findPhoto, makeQr } = {}) {
  const { cell, card, others } = splitSheet(annotations);
  const vars = { ...plan.groupRecord, "page in group": String(plan.pageInGroup), "pages in group": String(plan.pagesInGroup), "records in group": String(plan.recordsInGroup) };
  const missing = [], out = [];
  const place = () => {
    plan.slotRecords.forEach((record, k) => {
      if (!record) return;
      const { dx, dy } = offsets[k] || { dx: 0, dy: 0 };
      const items = drawOutline ? [{ ...cell, sheetCell: undefined, id: cell.id }] : [];
      for (const a of card) {
        const filled = fillItem(a, record, { lang, findPhoto, makeQr });
        for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
        if (filled.ann) items.push(filled.ann);
      }
      out.push(...remapItems(items.map((a) => moved(a, dx, dy)), newId, newGroupId));
    });
  };
  const firstCardIndex = annotations.findIndex((a) => a === cell || card.includes(a));
  let placed = false;
  annotations.forEach((a, i) => {
    if (a === cell || card.includes(a)) { if (!placed && i >= firstCardIndex) { placed = true; place(); } return; }
    if (!showsOnPage(a.showOn, plan, repeatOthers)) return;
    const filled = fillItem(a, vars, { lang, findPhoto, makeQr });
    for (const f of filled.missing) if (!missing.includes(f)) missing.push(f);
    if (filled.ann) out.push(...remapItems([filled.ann], newId, newGroupId));
  });
  if (!placed) place();
  return { annotations: out, missing };
}

// What the page canvas adds to show the whole sheet while you design the first cell: copies of the card (not selectable) in the other cells, filled with
// the next rows. `records[start + k]` goes in cell k.
export function sheetPreviewExtras(annotations, records, start, offsets, baseId, { lang, findPhoto, makeQr } = {}) {
  const { card } = splitSheet(annotations);
  const out = [];
  let id = baseId;
  for (let k = 1; k < offsets.length; k++) {
    const record = records[start + k];
    if (!record) continue;
    for (const a of card) {
      const filled = fillItem(a, record, { lang, findPhoto, makeQr });
      if (filled.ann) out.push({ ...moved(filled.ann, offsets[k].dx, offsets[k].dy), id: id++, locked: true, groupId: undefined, threadFrom: undefined, dataBlock: undefined });
    }
  }
  return out;
}

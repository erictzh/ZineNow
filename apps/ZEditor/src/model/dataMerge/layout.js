// How records are placed on pages for the data merge: one per page, or a grid of cells on each sheet (labels, name cards, invitations, a
// picture gallery). All in millimetres. Pure.

export const PAGE_SIZES_MM = { a4: { w: 210, h: 297 }, a5: { w: 148, h: 210 }, a3: { w: 297, h: 420 }, letter: { w: 215.9, h: 279.4 } };

// Ready sizes. `cols` and `rows` are how many fit on the sheet; `origin` is where the first cell starts (so sheets with uneven margins, like label
// sheets, line up). Label numbers are the common "L7160"-style sheets and are only a guide: check the sheet's own size.
export const GRID_PRESETS = [
  { key: "name-card", label: "Name card 90 × 55 mm (2 × 5 on A4)", page: "a4", cell: { w: 90, h: 55 }, cols: 2, rows: 5, origin: { x: 15, y: 11 }, gap: { x: 0, y: 0 } },
  { key: "label-3x7", label: "Address label 63.5 × 38.1 mm (3 × 7 on A4)", page: "a4", cell: { w: 63.5, h: 38.1 }, cols: 3, rows: 7, origin: { x: 7.2, y: 15.15 }, gap: { x: 2.54, y: 0 } },
  { key: "label-2x7", label: "Address label 99.1 × 38.1 mm (2 × 7 on A4)", page: "a4", cell: { w: 99.1, h: 38.1 }, cols: 2, rows: 7, origin: { x: 4.65, y: 15.15 }, gap: { x: 2.54, y: 0 } },
  { key: "invite-a6", label: "Invitation A6 105 × 148.5 mm (2 × 2 on A4)", page: "a4", cell: { w: 105, h: 148.5 }, cols: 2, rows: 2, origin: { x: 0, y: 0 }, gap: { x: 0, y: 0 } },
  { key: "gallery-3x4", label: "Picture gallery, 3 × 4 on A4", page: "a4", cell: { w: 60, h: 62 }, cols: 3, rows: 4, origin: { x: 15, y: 20 }, gap: { x: 7.5, y: 6 } },
];
export const presetByKey = (key) => GRID_PRESETS.find((p) => p.key === key) || null;

// The cells of one sheet, reading order (left to right, then down): [{ col, row, x, y, w, h }] in mm from the sheet's top-left corner.
// layout: { cell: { w, h }, cols, rows, origin: { x, y }, gap: { x, y } }
export function gridCells(layout) {
  const cells = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      cells.push({ col, row, x: layout.origin.x + col * (layout.cell.w + layout.gap.x), y: layout.origin.y + row * (layout.cell.h + layout.gap.y), w: layout.cell.w, h: layout.cell.h });
    }
  }
  return cells;
}

// How many whole cells of `cell` size fit across and down a page of `page` size inside `margin`, with `gap` between them.
export function fitGrid(page, cell, margin, gap) {
  const across = Math.floor((page.w - 2 * margin.x + gap.x) / (cell.w + gap.x));
  const down = Math.floor((page.h - 2 * margin.y + gap.y) / (cell.h + gap.y));
  return { cols: Math.max(0, across), rows: Math.max(0, down) };
}

// Which record goes in which cell of which sheet: [{ cells: [recordNumber | null...] }]. The last sheet is filled as far as the records go.
export function sheetsFor(recordCount, perSheet) {
  if (perSheet < 1) return [];
  const sheets = [];
  for (let start = 0; start < recordCount; start += perSheet) {
    sheets.push({ cells: Array.from({ length: perSheet }, (_, k) => (start + k < recordCount ? start + k : null)) });
  }
  return sheets;
}

// The page numbers a merge makes: records x the pages of the template (a two-page template is a front and a back for every record).
export function mergedPageCount(recordCount, templatePages = 1) {
  return recordCount * Math.max(1, templatePages);
}

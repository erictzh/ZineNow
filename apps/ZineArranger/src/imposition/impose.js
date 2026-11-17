// Imposition as a pure function: options + page count -> the sheets, and which page goes in each cell.

import { LAYOUTS } from "./layouts.js";
import { resolveSheetsPerSig } from "./signatures.js";

const SIZE_KEYS = ["half", "quarter", "eighth", "12th", "16th", "24th", "32nd", "36th", "48th", "64th"];

// The LAYOUTS key for a set of options.
export function layoutKey({ size, doubleSided, zinePortrait, spineSide, quarterCopy }) {
  const key = [SIZE_KEYS[size], doubleSided ? "double" : "single", zinePortrait ? "portrait" : "landscape", spineSide ? "side" : "top"].join("/");
  return key + (SIZE_KEYS[size] === "quarter" && doubleSided && quarterCopy ? "/copy" : "");
}

// Returns { pageCount, portraitPaper, sheets }. `pageCount` is padded with
// blank pages up to whole sheets and whole signatures. Each sheet side is
// { id, grid, cells: [{ pos, tokens, page, copy }] } in printing order, where
// `tokens` are the cell's "r"/cut/fold markers in order (see layouts.js).
//
// `sigSize` (sheets per signature, 0 or less = automatic) may be the raw
// string from the number box; it is used exactly as the original code did.
export function impose({ size, doubleSided, zinePortrait, spineSide, quarterCopy, flipBackCover, sigSize }, contentPageCount) {
  const layout = LAYOUTS[layoutKey({ size, doubleSided, zinePortrait, spineSide, quarterCopy })];
  const { pagesPerSheet } = layout;
  const step = layout.step || pagesPerSheet / 2;

  // Pad to whole sheets, then to whole signatures.
  let pageCount = contentPageCount;
  if (pageCount % pagesPerSheet != 0) pageCount += pagesPerSheet - (pageCount % pagesPerSheet);
  let sheetsPerSig = sigSize;
  if (sheetsPerSig <= 0) sheetsPerSig = resolveSheetsPerSig(pageCount, pagesPerSheet);
  const pagesPerSig = sheetsPerSig * pagesPerSheet;
  if (pageCount % pagesPerSig != 0) pageCount += pagesPerSig - (pageCount % pagesPerSig);

  const sheets = [];
  for (let i = 0; i < pageCount / pagesPerSheet; i++) {
    // Sheet i nests inside the previous ones of its signature: its first
    // page s moves `step` pages in from the front, its last page e as many in from the back.
    const sigCount = Math.floor(i / sheetsPerSig);
    const s = step * (i % sheetsPerSig) + sigCount * pagesPerSig;
    const e = (sigCount + 1) * pagesPerSig - step * (i % sheetsPerSig) - 1;
    const anchors = { s, e, m: s + pagesPerSig / 4, n: e - pagesPerSig / 4 };
    const isBackCoverSheet = !flipBackCover && e == pageCount - 1;

    layout.sides.forEach((cells, side) => {
      sheets.push({
        id: i * (layout.sheetIdStep || layout.sides.length) + side,
        grid: layout.grid,
        cells: cells.map((spec, cellIndex) => {
          const override = isBackCoverSheet && layout.backCover && layout.backCover.find((b) => b.side === side && b.cell === cellIndex);
          return parseCell(override ? override.spec : spec, anchors);
        }),
      });
    });
  }
  return { pageCount, portraitPaper: layout.portraitPaper, sheets };
}

// "tml r cutRight foldTop s+2" -> { pos: "tml", tokens: ["r", "cutRight", "foldTop"], page: s + 2, copy: "" }
function parseCell(spec, anchors) {
  const parts = spec.split(" ");
  const pos = parts[0];
  const pageExpr = parts[parts.length - 1];
  const m = /^([semn])(?:([+-])(\d+))?(b?)$/.exec(pageExpr);
  if (!m) throw new Error("Bad cell spec: " + spec);
  const offset = m[2] ? (m[2] === "+" ? 1 : -1) * Number(m[3]) : 0;
  return { pos, tokens: parts.slice(1, -1), page: anchors[m[1]] + offset, copy: m[4] };
}

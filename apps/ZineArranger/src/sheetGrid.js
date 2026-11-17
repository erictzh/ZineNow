// How each zine size divides a sheet: the grid of pages, pages per sheet, and which way the paper is turned.

import { SIZE_12TH, SIZE_16TH, SIZE_24TH, SIZE_32ND, SIZE_36TH, SIZE_48TH, SIZE_64TH, SIZE_EIGHTH, SIZE_HALF, SIZE_QUARTER } from "./sizes.js";

// Pages across (cols) and down (rows) one side of a sheet, for a portrait zine.
const GRIDS = {
  [SIZE_HALF]: { cols: 2, rows: 1 },
  [SIZE_QUARTER]: { cols: 2, rows: 2 },
  [SIZE_EIGHTH]: { cols: 4, rows: 2 },
  [SIZE_12TH]: { cols: 6, rows: 2 },
  [SIZE_16TH]: { cols: 4, rows: 4 },
  [SIZE_24TH]: { cols: 6, rows: 4 },
  [SIZE_32ND]: { cols: 8, rows: 4 },
  [SIZE_36TH]: { cols: 6, rows: 6 },
  [SIZE_48TH]: { cols: 8, rows: 6 },
  [SIZE_64TH]: { cols: 8, rows: 8 },
};

// Returns { pgmult, divHoriz, divVert, pagePortrait }:
//   pgmult        zine pages per sheet of paper (both sides when double-sided)
//   divHoriz/Vert pages across / down one side of the printed sheet
//   pagePortrait  whether the printed sheet is portrait
// A square grid keeps the zine's own orientation; any other grid is turned
// a quarter, so the paper's orientation is the opposite of the zine's and a
// landscape zine swaps the grid's rows and columns.
export function sheetGrid({ size, doubleSided, quarterCopy, zinePortrait }) {
  const { cols, rows } = GRIDS[size];
  const square = cols === rows;
  let pgmult = doubleSided ? cols * rows * 2 : cols * rows;
  if (size === SIZE_HALF) pgmult = 4; // half size is always printed on both sides of one fold
  if (size === SIZE_QUARTER && doubleSided && quarterCopy) pgmult = 4; // two copies of the same pages per sheet
  const turnGrid = !square && !zinePortrait;
  return {
    pgmult,
    divHoriz: turnGrid ? rows : cols,
    divVert: turnGrid ? cols : rows,
    pagePortrait: square ? zinePortrait : !zinePortrait,
  };
}

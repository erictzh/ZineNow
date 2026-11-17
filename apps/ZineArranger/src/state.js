// All of the app's changing values in one place: the chosen options, the computed sheet/page layout, and UI flags.

import { SIZE_EIGHTH } from "./sizes.js";

export const state = {
  size: SIZE_EIGHTH,
  doubleSided: false, // whether we are printing double-sided
  zinePortrait: true, // whether the zine is portrait orientation (false=landscape)
  spineSide: true, // whether the spine is on the side of the zine (false=top spine)
  flipBackCover: true, // whether to flip the back cover on top fold zines (false = cover is right-side up from outside; true = cover right side up when viewed as last page)
  quarterCopy: false, // whether each sheet of a quarter-sized zine should have two copies instead of two different sheets of pages
  guideMargins: false, // whether to display a guide line around the margins
  guideCenter: false, // whether to display a guide line along the center cut section (for quarter sized & 8-page mini)
  guideFolds: false, // whether to display guide lines along folds
  blankAfterPages: [], // list of PDF page numbers (1-indexed) after which a manual blank zine page should be inserted; a page number listed twice inserts two blanks
  pageRangeSpec: "", // raw "Select Pages" field value (e.g. "1-3,7") — parsed against the real page count once a PDF is loaded, see parsePageRange()
  logPanelVisible: true, // whether the activity log panel is expanded
  pagePortrait: false, // whether the printed page is portrait orientation (calculated based on above values)
  aspectWidth: 297,
  aspectHeight: 210,
  divHoriz: 4, // number of horizontal pages per sheet
  divVert: 2, // number of vertical pages per sheet
  pagerat: 5.5/4.25,
  pgmult: 8, // number of zine pages on a full sheet
  sheetWidth: 1100,
  sheetHeight: 850,
  pageWidth: 275,
  pageHeight: 425,
  pageCount: 0,
  sigSize: -1, // the size of each signature, in full sheets of paper. -1 will make the whole zine in one signature (subject to the auto-cap below, unless overridden)
  specsString: "8-1ps",
  pgunit: "mm",
  showExtraSizes: false,
  previewResizeTimer: null, // pending window-resize update (see main.js)
  isReverseImposeActive: false, // true once the "Reverse Impose" toggle is on
};

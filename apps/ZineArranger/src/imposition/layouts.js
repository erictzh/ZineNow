// Every zine layout as data: for each sheet side, which page goes in which cell, rotated or not, with which guide lines.
//
// Key: "<size>/<single|double>/<portrait|landscape>/<side|top>", plus "/copy"
// for quarter-size double-sided zines printed two copies per sheet.
//
// Each entry:
//   grid           CSS grid class of the sheet (cell positions come from it)
//   portraitPaper  whether the printed sheet is portrait (sets @page orientation)
//   pagesPerSheet  zine pages on one sheet of paper (both sides)
//   step           pages a sheet moves inward per sheet in a signature (default pagesPerSheet / 2)
//   sheetIdStep    sheet ids go up by this per sheet (default: the number of sides; a few
//                  single-sided layouts historically count in twos)
//   sides          one array per sheet side; each cell is "<position> [r] [guides…] <page>":
//                    r          the page is printed upside down (rotated 180°)
//                    cutX/foldX a cut (solid with the center guide) or fold (dotted) line on side X
//                    page       s+k / e-k: k pages after the sheet's first page s, or before its
//                               last page e, within the signature; m / n are s / e moved a
//                               quarter signature inward (nested quarter-size layout);
//                               a trailing "b" is the second copy (quarter copy mode)
//   backCover      cells that use a different spec when "flip back cover" is off and the
//                  cell holds the zine's last page
//
// Extracted from the original hand-written layout code and checked against it
// for every option combination (see docs/ARCHITECTURE.md).

export const LAYOUTS = {
  "half/single/portrait/side": {
    grid: "half-por", portraitPaper: false, pagesPerSheet: 4,
    sides: [
      [
        "tl e", "tr foldLeft s",
      ],
      [
        "tl s+1", "tr foldLeft e-1",
      ],
    ],
  },
  "half/single/landscape/side": {
    grid: "half-lnd", portraitPaper: true, pagesPerSheet: 4,
    sides: [
      [
        "tl s", "tr foldBottom e",
      ],
      [
        "tl r s+1", "tr r foldTop e-1",
      ],
    ],
    backCover: [{ side: 0, cell: 1, spec: "tr r foldTop e" }],
  },
  "quarter/single/portrait/side": {
    grid: "", portraitPaper: true, pagesPerSheet: 4,
    sides: [
      [
        "tl r foldTop s", "tr r foldRight foldTop e", "bl s+1", "br foldLeft e-1",
      ],
    ],
  },
  "quarter/single/portrait/top": {
    grid: "", portraitPaper: true, pagesPerSheet: 4,
    sides: [
      [
        "tl r foldTop e-1", "tr foldLeft foldBottom e", "bl r s+1", "br foldLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 1, spec: "tr r foldRight foldTop e" }],
  },
  "quarter/single/landscape/side": {
    grid: "", portraitPaper: false, pagesPerSheet: 4,
    sides: [
      [
        "tl r foldTop e-1", "tr r foldRight foldTop s+1", "bl e", "br foldLeft s",
      ],
    ],
  },
  "quarter/single/landscape/top": {
    grid: "", portraitPaper: false, pagesPerSheet: 4,
    sides: [
      [
        "tl r foldTop e-1", "tr foldLeft foldBottom e", "bl r s+1", "br foldLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 1, spec: "tr r foldRight foldTop e" }],
  },
  "quarter/double/portrait/side": {
    grid: "qtr-side", portraitPaper: true, pagesPerSheet: 8, step: 2,
    sides: [
      [
        "tl cutBottom e", "tr foldLeft cutBottom s", "bl n", "br foldLeft m",
      ],
      [
        "tl cutBottom s+1", "tr foldLeft cutBottom e-1", "bl m+1", "br foldLeft n-1",
      ],
    ],
  },
  "quarter/double/portrait/side/copy": {
    grid: "qtr-side", portraitPaper: true, pagesPerSheet: 4,
    sides: [
      [
        "tl cutBottom e", "tr foldLeft cutBottom s", "bl eb", "br foldLeft sb",
      ],
      [
        "tl cutBottom s+1", "tr foldLeft cutBottom e-1", "bl s+1b", "br foldLeft e-1b",
      ],
    ],
  },
  "quarter/double/portrait/top": {
    grid: "qtr-side", portraitPaper: true, pagesPerSheet: 8, step: 2,
    sides: [
      [
        "tl foldBottom n", "tr cutLeft foldBottom e", "bl m", "br cutLeft s",
      ],
      [
        "tl r foldTop e-1", "tr r cutRight foldTop n-1", "bl r s+1", "br r cutRight m+1",
      ],
    ],
    backCover: [{ side: 0, cell: 1, spec: "tr r cutRight foldTop e" }],
  },
  "quarter/double/portrait/top/copy": {
    grid: "qtr-side", portraitPaper: true, pagesPerSheet: 4,
    sides: [
      [
        "tl foldBottom e", "tr cutLeft foldBottom eb", "bl s", "br cutLeft sb",
      ],
      [
        "tl r foldTop e-1", "tr r cutRight foldTop e-1b", "bl r s+1", "br r cutRight s+1b",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }, { side: 0, cell: 1, spec: "tr r cutRight foldTop eb" }],
  },
  "quarter/double/landscape/side": {
    grid: "qtr-side", portraitPaper: false, pagesPerSheet: 8, step: 2,
    sides: [
      [
        "tl cutBottom e", "tr foldLeft cutBottom s", "bl n", "br foldLeft m",
      ],
      [
        "tl cutBottom s+1", "tr foldLeft cutBottom e-1", "bl m+1", "br foldLeft n-1",
      ],
    ],
  },
  "quarter/double/landscape/side/copy": {
    grid: "qtr-side", portraitPaper: false, pagesPerSheet: 4,
    sides: [
      [
        "tl cutBottom e", "tr foldLeft cutBottom s", "bl eb", "br foldLeft sb",
      ],
      [
        "tl cutBottom s+1", "tr foldLeft cutBottom e-1", "bl s+1b", "br foldLeft e-1b",
      ],
    ],
  },
  "quarter/double/landscape/top": {
    grid: "qtr-side", portraitPaper: false, pagesPerSheet: 8, step: 2,
    sides: [
      [
        "tl foldBottom n", "tr cutLeft foldBottom e", "bl m", "br cutLeft s",
      ],
      [
        "tl r foldTop e-1", "tr r cutRight foldTop n-1", "bl r s+1", "br r cutRight m+1",
      ],
    ],
    backCover: [{ side: 0, cell: 1, spec: "tr r cutRight foldTop e" }],
  },
  "quarter/double/landscape/top/copy": {
    grid: "qtr-side", portraitPaper: false, pagesPerSheet: 4,
    sides: [
      [
        "tl foldBottom e", "tr cutLeft foldBottom eb", "bl s", "br cutLeft sb",
      ],
      [
        "tl r foldTop e-1", "tr r cutRight foldTop e-1b", "bl r s+1", "br r cutRight s+1b",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }, { side: 0, cell: 1, spec: "tr r cutRight foldTop eb" }],
  },
  "eighth/single/portrait/side": {
    grid: "eig-por", portraitPaper: false, pagesPerSheet: 8,
    sides: [
      [
        "tl r foldTop e-3", "tml r foldRight cutTop s+3", "tmr r foldRight cutTop s+2", "tr r foldRight foldTop s+1",
        "bl e-2", "bml foldLeft e-1", "bmr foldLeft e", "br foldLeft s",
      ],
    ],
  },
  "eighth/single/portrait/top": {
    grid: "eig-por", portraitPaper: false, pagesPerSheet: 8,
    sides: [
      [
        "tl foldBottom e", "tml r cutRight foldTop s+2", "tmr foldLeft foldBottom s+3", "tr r cutRight foldTop e-1",
        "bl s", "bml r foldRight s+1", "bmr cutLeft e-3", "br r foldRight e-2",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "tl r foldTop e" }],
  },
  "eighth/single/landscape/side": {
    grid: "eig-lnd", portraitPaper: true, pagesPerSheet: 8,
    sides: [
      [
        "tl r foldTop e", "tml foldLeft cutBottom s+2", "tmr r foldRight cutTop s+3", "tr foldLeft foldBottom e-1",
        "bl r s", "bml foldLeft s+1", "bmr r foldRight e-3", "br foldLeft e-2",
      ],
    ],
  },
  "eighth/single/landscape/top": {
    grid: "eig-lnd", portraitPaper: true, pagesPerSheet: 8,
    sides: [
      [
        "tl r foldTop e-3", "tml r foldRight foldTop s+3", "tmr r cutRight foldTop s+2", "tr r foldRight foldTop s+1",
        "bl e-2", "bml cutLeft e-1", "bmr foldLeft e", "br cutLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 6, spec: "bmr r foldRight e" }],
  },
  "eighth/double/portrait/side": {
    grid: "eig-por", portraitPaper: false, pagesPerSheet: 16,
    sides: [
      [
        "tl r cutTop s+4", "tml r foldRight cutTop e-4", "tmr r cutRight cutTop e-7", "tr r foldRight cutTop s+7",
        "bl s+3", "bml foldLeft e-3", "bmr cutLeft e", "br foldLeft s",
      ],
      [
        "tl r cutTop s+6", "tml r foldRight cutTop e-6", "tmr r cutRight cutTop e-5", "tr r foldRight cutTop s+5",
        "bl s+1", "bml foldLeft e-1", "bmr cutLeft e-2", "br foldLeft s+2",
      ],
    ],
  },
  "eighth/double/portrait/top": {
    grid: "eig-por", portraitPaper: false, pagesPerSheet: 16,
    sides: [
      [
        "tl r foldTop e-3", "tml cutLeft foldBottom e-4", "tmr r cutRight foldTop e-7", "tr cutLeft foldBottom e",
        "bl r s+3", "bml cutLeft s+4", "bmr r cutRight s+7", "br cutLeft s",
      ],
      [
        "tl r foldTop e-1", "tml cutLeft foldBottom e-6", "tmr r cutRight foldTop e-5", "tr cutLeft foldBottom e-2",
        "bl r s+1", "bml cutLeft s+6", "bmr r cutRight s+5", "br cutLeft s+2",
      ],
    ],
    backCover: [{ side: 0, cell: 3, spec: "tr r cutRight foldTop e" }],
  },
  "eighth/double/landscape/side": {
    grid: "eig-lnd", portraitPaper: true, pagesPerSheet: 16,
    sides: [
      [
        "tl r foldTop s+3", "tml cutLeft foldBottom s+4", "tmr r cutRight foldTop s+7", "tr cutLeft foldBottom s",
        "bl r e-3", "bml cutLeft e-4", "bmr r cutRight e-7", "br cutLeft e",
      ],
      [
        "tl r foldTop e-2", "tml cutLeft foldBottom e-5", "tmr r cutRight foldTop e-6", "tr cutLeft foldBottom e-1",
        "bl r s+2", "bml cutLeft s+5", "bmr r cutRight s+6", "br cutLeft s+1",
      ],
    ],
  },
  "eighth/double/landscape/top": {
    grid: "eig-lnd", portraitPaper: true, pagesPerSheet: 16,
    sides: [
      [
        "tl cutBottom s+7", "tml foldLeft cutBottom e-7", "tmr cutLeft cutBottom e", "tr foldLeft cutBottom s",
        "bl r s+4", "bml r foldRight e-4", "bmr r cutRight e-3", "br r cutRight s+3",
      ],
      [
        "tl cutBottom s+5", "tml foldLeft cutBottom e-5", "tmr cutLeft cutBottom e-2", "tr foldLeft cutBottom s+2",
        "bl r s+6", "bml r foldRight e-6", "bmr r cutRight e-1", "br r foldRight s+1",
      ],
    ],
    backCover: [{ side: 0, cell: 2, spec: "tmr r cutRight cutTop e" }],
  },
  "12th/single/portrait/side": {
    grid: "twlv-por", portraitPaper: false, pagesPerSheet: 12, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-5", "g01 r cutTop foldRight s+5", "g02 r cutTop foldRight s+4", "g03 r cutTop foldRight s+3",
        "g04 r cutTop foldRight s+2", "g05 r foldTop foldRight s+1", "g10 e-4", "g11 foldLeft e-3",
        "g12 foldLeft e-2", "g13 foldLeft e-1", "g14 foldLeft e", "g15 foldLeft s",
      ],
    ],
  },
  "12th/single/portrait/top": {
    grid: "twlv-por", portraitPaper: false, pagesPerSheet: 12, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e", "g01 r foldTop cutRight s+2", "g02 foldBottom foldLeft s+3", "g03 r foldTop cutRight e-5",
        "g04 foldBottom foldLeft e-4", "g05 r cutRight foldTop e-1", "g10 s", "g11 r foldRight s+1",
        "g12 cutLeft s+4", "g13 r foldRight s+5", "g14 cutLeft e-3", "g15 r foldRight e-2",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "12th/single/landscape/side": {
    grid: "twlv-lnd", portraitPaper: true, pagesPerSheet: 12, sheetIdStep: 2,
    sides: [
      [
        "g00 r cutTop e-1", "g01 r foldTop foldRight e-2", "g10 foldBottom e-4", "g11 cutBottom foldLeft e-3",
        "g20 r cutTop e-5", "g21 r foldTop foldRight s+5", "g30 foldBottom s+3", "g31 cutBottom foldLeft s+4",
        "g40 r cutTop s+2", "g41 r foldTop foldRight s+1", "g50 e", "g51 foldLeft s",
      ],
    ],
  },
  "12th/single/landscape/top": {
    grid: "twlv-lnd", portraitPaper: true, pagesPerSheet: 12, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-4", "g01 r foldRight foldTop e-5", "g10 foldBottom e-3", "g11 r cutRight foldTop s+5",
        "g20 foldBottom e-2", "g21 r cutRight foldTop s+4", "g30 foldBottom e-1", "g31 r cutRight foldTop s+3",
        "g40 foldBottom e", "g41 r cutRight foldTop s+2", "g50 s", "g51 r foldRight s+1",
      ],
    ],
    backCover: [{ side: 0, cell: 8, spec: "g40 r foldTop e" }],
  },
  "12th/double/portrait/side": {
    grid: "twlv-por", portraitPaper: false, pagesPerSheet: 24,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g10 e-6", "g11 foldLeft s+6",
        "g12 cutLeft e-8", "g13 foldLeft s+8", "g14 cutLeft e-10", "g15 foldLeft s+10",
      ],
      [
        "g00 cutBottom s+5", "g01 cutBottom foldLeft e-5", "g02 cutBottom cutLeft s+3", "g03 cutBottom foldLeft e-3",
        "g04 cutBottom cutLeft s+1", "g05 cutBottom foldLeft e-1", "g10 s+11", "g11 foldLeft e-11",
        "g12 cutLeft s+9", "g13 foldLeft e-9", "g14 cutLeft s+7", "g15 foldLeft e-7",
      ],
    ],
  },
  "12th/double/portrait/top": {
    grid: "twlv-por", portraitPaper: false, pagesPerSheet: 24,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g10 s", "g11 cutLeft s+2",
        "g12 cutLeft s+4", "g13 cutLeft s+6", "g14 cutLeft s+8", "g15 cutLeft s+10",
      ],
      [
        "g00 r foldTop e-11", "g01 r foldTop cutRight e-9", "g02 r foldTop cutRight e-7", "g03 r foldTop cutRight e-5",
        "g04 r foldTop cutRight e-3", "g05 r foldTop cutRight e-1", "g10 r s+11", "g11 r cutRight s+9",
        "g12 r cutRight s+7", "g13 r cutRight s+5", "g14 r cutRight s+3", "g15 r cutRight s+1",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "12th/double/landscape/side": {
    grid: "twlv-lnd", portraitPaper: true, pagesPerSheet: 24,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g10 cutBottom e-2", "g11 cutBottom foldLeft s+2",
        "g20 cutBottom e-4", "g21 cutBottom foldLeft s+4", "g30 cutBottom e-6", "g31 cutBottom foldLeft s+6",
        "g40 cutBottom e-8", "g41 cutBottom foldLeft s+8", "g50 e-10", "g51 foldLeft s+10",
      ],
      [
        "g00 cutBottom s+1", "g01 cutBottom foldLeft e-1", "g10 cutBottom s+3", "g11 cutBottom foldLeft e-3",
        "g20 cutBottom s+5", "g21 cutBottom foldLeft e-5", "g30 cutBottom s+7", "g31 cutBottom foldLeft e-7",
        "g40 cutBottom s+9", "g41 cutBottom foldLeft e-9", "g50 s+11", "g51 foldLeft e-11",
      ],
    ],
  },
  "12th/double/landscape/top": {
    grid: "twlv-lnd", portraitPaper: true, pagesPerSheet: 24,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g10 cutBottom s", "g11 cutBottom cutLeft s+2",
        "g20 foldBottom e-4", "g21 foldBottom cutLeft e-6", "g30 cutBottom s+4", "g31 cutBottom cutLeft s+6",
        "g40 foldBottom e-8", "g41 foldBottom cutLeft e-10", "g50 s+8", "g51 cutLeft s+10",
      ],
      [
        "g00 r foldTop e-3", "g01 r foldTop cutRight e-1", "g10 r cutTop s+3", "g11 r cutTop cutRight s+1",
        "g20 r foldTop e-7", "g21 r foldTop cutRight e-5", "g30 r cutTop s+7", "g31 r cutTop cutRight s+5",
        "g40 r foldTop e-11", "g41 r foldTop cutRight e-9", "g50 r s+11", "g51 r cutRight s+9",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "16th/single/portrait/side": {
    grid: "sxtn-por", portraitPaper: true, pagesPerSheet: 16, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-7", "g01 r foldRight cutTop s+7", "g02 r foldRight cutTop s+6", "g03 r foldRight foldTop s+5",
        "g10 cutBottom e-6", "g11 foldLeft foldBottom e-5", "g12 cutLeft foldBottom s+3", "g13 foldLeft cutBottom s+4",
        "g20 r foldTop e-3", "g21 r foldRight cutTop e-4", "g22 r cutRight cutTop s+2", "g23 r foldRight foldTop s+1",
        "g30 e-2", "g31 foldLeft e-1", "g32 foldLeft e", "g33 foldLeft s",
      ],
    ],
  },
  "16th/single/portrait/top": {
    grid: "sxtn-por", portraitPaper: true, pagesPerSheet: 16, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-7", "g01 foldLeft foldBottom e-6", "g02 r cutRight foldTop e-3", "g03 foldLeft foldBottom e-2",
        "g10 r foldBottom s+7", "g11 cutLeft cutBottom e-5", "g12 r foldRight cutTop e-4", "g13 cutLeft foldBottom e-1",
        "g20 r foldTop s+6", "g21 cutLeft foldBottom s+3", "g22 r foldRight foldTop s+2", "g23 cutLeft foldBottom e",
        "g30 r s+5", "g31 foldLeft s+4", "g32 r cutRight s+1", "g33 foldLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 11, spec: "g23 r cutRight foldTop e" }],
  },
  "16th/single/landscape/side": {
    grid: "sxtn-lnd", portraitPaper: false, pagesPerSheet: 16, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-2", "g01 foldLeft cutBottom e-1", "g02 foldLeft cutBottom e", "g03 foldLeft foldBottom s",
        "g10 r cutTop e-3", "g11 r foldRight foldTop e-4", "g12 r cutRight foldTop s+2", "g13 r foldRight cutTop s+1",
        "g20 foldBottom e-6", "g21 foldLeft cutBottom e-5", "g22 cutLeft cutBottom s+3", "g23 foldLeft foldBottom s+4",
        "g30 r e-7", "g31 r foldRight s+7", "g32 r foldRight s+6", "g33 r foldRight s+5",
      ],
    ],
  },
  "16th/single/landscape/top": {
    grid: "sxtn-lnd", portraitPaper: false, pagesPerSheet: 16, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-2", "g01 r foldRight foldTop e-3", "g02 cutLeft foldBottom e-6", "g03 r foldRight foldTop e-7",
        "g10 foldBottom e-1", "g11 r cutRight cutTop e-4", "g12 foldLeft cutBottom e-5", "g13 r cutRight foldTop s+7",
        "g20 foldBottom e", "g21 r cutRight foldTop s+2", "g22 foldLeft foldBottom s+3", "g23 r cutRight foldTop s+6",
        "g30 s", "g31 r foldRight s+1", "g32 cutLeft s+4", "g33 r foldRight s+5",
      ],
    ],
    backCover: [{ side: 0, cell: 8, spec: "g20 r foldTop e" }],
  },
  "16th/double/portrait/side": {
    grid: "sxtn-por", portraitPaper: true, pagesPerSheet: 32,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g10 cutBottom e-4", "g11 cutBottom foldLeft s+4", "g12 cutBottom cutLeft e-6", "g13 cutBottom foldLeft s+6",
        "g20 cutBottom e-8", "g21 cutBottom foldLeft s+8", "g22 cutBottom cutLeft e-10", "g23 cutBottom foldLeft s+10",
        "g30 e-12", "g31 foldLeft s+12", "g32 cutLeft e-14", "g33 foldLeft s+14",
      ],
      [
        "g00 cutBottom s+3", "g01 cutBottom foldLeft e-3", "g02 cutBottom cutLeft s+1", "g03 cutBottom foldLeft e-1",
        "g10 cutBottom s+7", "g11 cutBottom foldLeft e-7", "g12 cutBottom cutLeft s+5", "g13 cutBottom foldLeft e-5",
        "g20 cutBottom s+11", "g21 cutBottom foldLeft e-11", "g22 cutBottom cutLeft s+9", "g23 cutBottom foldLeft e-9",
        "g30 s+15", "g31 foldLeft e-15", "g32 cutLeft s+13", "g33 foldLeft e-13",
      ],
    ],
  },
  "16th/double/portrait/top": {
    grid: "sxtn-por", portraitPaper: true, pagesPerSheet: 32,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g20 foldBottom e-8", "g21 foldBottom cutLeft e-10", "g22 foldBottom cutLeft e-12", "g23 foldBottom cutLeft e-14",
        "g30 s+8", "g31 cutLeft s+10", "g32 cutLeft s+12", "g33 cutLeft s+14",
      ],
      [
        "g00 r foldTop e-7", "g01 r foldTop cutRight e-5", "g02 r foldTop cutRight e-3", "g03 r foldTop cutRight e-1",
        "g10 r cutTop s+7", "g11 r cutTop cutRight s+5", "g12 r cutTop cutRight s+3", "g13 r cutTop cutRight s+1",
        "g20 r foldTop e-15", "g21 r foldTop cutRight e-13", "g22 r foldTop cutRight e-11", "g23 r foldTop cutRight e-9",
        "g30 r s+15", "g31 r cutRight s+13", "g32 r cutRight s+11", "g33 r cutRight s+9",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "16th/double/landscape/side": {
    grid: "sxtn-lnd", portraitPaper: false, pagesPerSheet: 32,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g10 cutBottom e-4", "g11 cutBottom foldLeft s+4", "g12 cutBottom cutLeft e-6", "g13 cutBottom foldLeft s+6",
        "g20 cutBottom e-8", "g21 cutBottom foldLeft s+8", "g22 cutBottom cutLeft e-10", "g23 cutBottom foldLeft s+10",
        "g30 e-12", "g31 foldLeft s+12", "g32 cutLeft e-14", "g33 foldLeft s+14",
      ],
      [
        "g00 cutBottom s+3", "g01 cutBottom foldLeft e-3", "g02 cutBottom cutLeft s+1", "g03 cutBottom foldLeft e-1",
        "g10 cutBottom cutLeft s+7", "g11 cutBottom foldLeft e-7", "g12 cutBottom cutLeft s+5", "g13 cutBottom foldLeft e-5",
        "g20 cutBottom cutLeft s+11", "g21 cutBottom foldLeft e-11", "g22 cutBottom cutLeft s+9", "g23 cutBottom foldLeft e-9",
        "g30 s+15", "g31 foldLeft e-15", "g32 cutLeft s+13", "g33 foldLeft e-13",
      ],
    ],
  },
  "16th/double/landscape/top": {
    grid: "sxtn-lnd", portraitPaper: false, pagesPerSheet: 32,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g20 foldBottom e-8", "g21 foldBottom cutLeft e-10", "g22 foldBottom cutLeft e-12", "g23 foldBottom cutLeft e-14",
        "g30 s+8", "g31 cutLeft s+10", "g32 cutLeft s+12", "g33 cutLeft s+14",
      ],
      [
        "g00 r foldTop e-7", "g01 r foldTop cutRight e-5", "g02 r foldTop cutRight e-3", "g03 r foldTop cutRight e-1",
        "g10 r cutTop s+7", "g11 r cutTop cutRight s+5", "g12 r cutTop cutRight s+3", "g13 r cutTop cutRight s+1",
        "g20 r foldTop e-15", "g21 r foldTop cutRight e-13", "g22 r foldTop cutRight e-11", "g23 r foldTop cutRight e-9",
        "g30 r s+15", "g31 r cutRight s+13", "g32 r cutRight s+11", "g33 r cutRight s+9",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "24th/single/portrait/side": {
    grid: "twfr-por", portraitPaper: false, pagesPerSheet: 24, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-9", "g01 r cutTop foldRight e-10", "g02 r cutTop foldRight e-11", "g03 r cutTop foldRight s+11",
        "g04 r cutTop foldRight s+10", "g05 r foldTop foldRight s+9", "g10 cutBottom e-8", "g11 foldBottom foldLeft e-7",
        "g12 foldBottom cutLeft s+5", "g13 cutBottom foldLeft s+6", "g14 cutBottom foldLeft s+7", "g15 cutBottom foldLeft s+8",
        "g20 r foldTop e-5", "g21 r cutTop foldRight e-6", "g22 r cutTop cutRight s+4", "g23 r cutTop foldRight s+3",
        "g24 r cutTop foldRight s+2", "g25 r foldTop foldRight s+1", "g30 e-4", "g31 foldLeft e-3",
        "g32 foldLeft e-2", "g33 foldLeft e-1", "g34 foldLeft e", "g35 foldLeft s",
      ],
    ],
  },
  "24th/single/portrait/top": {
    grid: "twfr-por", portraitPaper: false, pagesPerSheet: 24, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-11", "g01 foldBottom foldLeft e-10", "g02 r foldTop cutRight e-7", "g03 foldBottom foldLeft e-6",
        "g04 r foldTop cutRight e-3", "g05 foldBottom foldLeft e-2", "g10 r foldTop s+11", "g11 cutBottom cutLeft e-9",
        "g12 r cutTop foldRight e-8", "g13 cutBottom cutLeft e-5", "g14 r cutTop foldRight e-4", "g15 foldBottom cutLeft e-1",
        "g20 r foldTop s+10", "g21 foldBottom cutLeft s+7", "g22 r foldTop foldRight s+6", "g23 foldBottom cutLeft s+3",
        "g24 r foldTop foldRight s+2", "g25 foldBottom cutLeft e", "g30 r s+9", "g31 foldLeft s+8",
        "g32 r cutRight s+5", "g33 foldLeft s+4", "g34 r cutRight s+1", "g35 foldLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 17, spec: "g25 r cutRight foldTop e" }],
  },
  "24th/single/landscape/side": {
    grid: "twfr-lnd", portraitPaper: true, pagesPerSheet: 24, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-2", "g01 cutBottom foldLeft e-1", "g02 cutBottom foldLeft e", "g03 foldBottom foldLeft s",
        "g10 r cutTop e-3", "g11 r foldTop foldRight e-4", "g12 r foldTop cutRight s+2", "g13 r cutTop foldRight s+1",
        "g20 foldBottom e-6", "g21 cutBottom foldLeft e-5", "g22 cutBottom cutLeft s+3", "g23 foldBottom foldLeft s+4",
        "g30 r cutTop e-7", "g31 r foldTop foldRight e-8", "g32 r foldTop cutRight s+6", "g33 r cutTop foldRight s+5",
        "g40 foldBottom e-10", "g41 cutBottom foldLeft e-9", "g42 cutBottom cutLeft s+7", "g43 foldBottom foldLeft s+8",
        "g50 r e-11", "g51 r foldLeft s+11", "g52 r foldLeft s+10", "g53 r foldLeft s+9",
      ],
    ],
  },
  "24th/single/landscape/top": {
    grid: "twfr-lnd", portraitPaper: true, pagesPerSheet: 24, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-4", "g01 r foldTop foldRight e-5", "g02 foldBottom cutLeft e-8", "g03 r foldTop foldRight e-9",
        "g10 foldBottom e-3", "g11 r cutTop cutRight e-6", "g12 cutBottom foldLeft e-7", "g13 r foldTop cutRight e-10",
        "g20 foldBottom e-2", "g21 r foldTop cutRight s+4", "g22 foldBottom foldLeft s+5", "g23 r foldTop cutRight e-11",
        "g30 foldBottom e-1", "g31 r foldTop cutRight s+3", "g32 foldBottom cutLeft s+6", "g33 r foldTop cutRight s+11",
        "g40 foldBottom e", "g41 r foldTop cutRight s+2", "g42 foldBottom cutLeft s+7", "g43 r foldTop cutRight s+10",
        "g50 s", "g51 r foldRight s+1", "g52 cutLeft s+8", "g53 r foldRight s+9",
      ],
    ],
    backCover: [{ side: 0, cell: 16, spec: "g40 r foldTop e" }],
  },
  "24th/double/portrait/side": {
    grid: "twfr-por", portraitPaper: false, pagesPerSheet: 48,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g10 cutBottom e-6", "g11 cutBottom foldLeft s+6",
        "g12 cutBottom cutLeft e-8", "g13 cutBottom foldLeft s+8", "g14 cutBottom cutLeft e-10", "g15 cutBottom foldLeft s+10",
        "g20 cutBottom e-12", "g21 cutBottom foldLeft s+12", "g22 cutBottom cutLeft e-14", "g23 cutBottom foldLeft s+14",
        "g24 cutBottom cutLeft e-16", "g25 cutBottom foldLeft s+16", "g30 e-18", "g31 foldLeft s+18",
        "g32 cutLeft e-20", "g33 foldLeft s+20", "g34 cutLeft e-22", "g35 foldLeft s+22",
      ],
      [
        "g00 cutBottom s+5", "g01 cutBottom foldLeft e-5", "g02 cutBottom cutLeft s+3", "g03 cutBottom foldLeft e-3",
        "g04 cutBottom cutLeft s+1", "g05 cutBottom foldLeft e-1", "g10 cutBottom s+11", "g11 cutBottom foldLeft e-11",
        "g12 cutBottom cutLeft s+9", "g13 cutBottom foldLeft e-9", "g14 cutBottom cutLeft s+7", "g15 cutBottom foldLeft e-7",
        "g20 cutBottom s+17", "g21 cutBottom foldLeft e-17", "g22 cutBottom cutLeft s+15", "g23 cutBottom foldLeft e-15",
        "g24 cutBottom cutLeft s+13", "g25 cutBottom foldLeft e-13", "g30 s+23", "g31 foldLeft e-23",
        "g32 cutLeft s+21", "g33 foldLeft e-21", "g34 cutLeft s+19", "g35 foldLeft e-19",
      ],
    ],
  },
  "24th/double/portrait/top": {
    grid: "twfr-por", portraitPaper: false, pagesPerSheet: 48,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g10 cutBottom s", "g11 cutBottom cutLeft s+2",
        "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6", "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10",
        "g20 foldBottom e-12", "g21 foldBottom cutLeft e-14", "g22 foldBottom cutLeft e-16", "g23 foldBottom cutLeft e-18",
        "g24 foldBottom cutLeft e-20", "g25 foldBottom cutLeft e-22", "g30 s+12", "g31 cutLeft s+14",
        "g32 cutLeft s+16", "g33 cutLeft s+18", "g34 cutLeft s+20", "g35 cutLeft s+22",
      ],
      [
        "g00 r foldTop e-11", "g01 r foldTop cutRight e-9", "g02 r foldTop cutRight e-7", "g03 r foldTop cutRight e-5",
        "g04 r foldTop cutRight e-3", "g05 r foldTop cutRight e-1", "g10 r cutTop s+11", "g11 r cutTop cutRight s+9",
        "g12 r cutTop cutRight s+7", "g13 r cutTop cutRight s+5", "g14 r cutTop cutRight s+3", "g15 r cutTop cutRight s+1",
        "g20 r foldTop e-23", "g21 r foldTop cutRight e-21", "g22 r foldTop cutRight e-19", "g23 r foldTop cutRight e-17",
        "g24 r foldTop cutRight e-15", "g25 r foldTop cutRight e-13", "g30 r s+23", "g31 r cutRight s+21",
        "g32 r cutRight s+19", "g33 r cutRight s+17", "g34 r cutRight s+15", "g35 r cutRight s+13",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "24th/double/landscape/side": {
    grid: "twfr-lnd", portraitPaper: true, pagesPerSheet: 48,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g10 cutBottom e-4", "g11 cutBottom foldLeft s+4", "g12 cutBottom cutLeft e-6", "g13 cutBottom foldLeft s+6",
        "g20 cutBottom e-8", "g21 cutBottom foldLeft s+8", "g22 cutBottom cutLeft e-10", "g23 cutBottom foldLeft s+10",
        "g30 cutBottom e-12", "g31 cutBottom foldLeft s+12", "g32 cutBottom cutLeft e-14", "g33 cutBottom foldLeft s+14",
        "g40 cutBottom e-16", "g41 cutBottom foldLeft s+16", "g42 cutBottom cutLeft e-18", "g43 cutBottom foldLeft s+18",
        "g50 e-20", "g51 foldLeft s+20", "g52 cutLeft e-22", "g53 foldLeft s+22",
      ],
      [
        "g00 cutBottom s+3", "g01 cutBottom foldLeft e-3", "g02 cutBottom cutLeft s+1", "g03 cutBottom foldLeft e-1",
        "g10 cutBottom s+7", "g11 cutBottom foldLeft e-7", "g12 cutBottom cutLeft s+5", "g13 cutBottom foldLeft e-5",
        "g20 cutBottom s+11", "g21 cutBottom foldLeft e-11", "g22 cutBottom cutLeft s+9", "g23 cutBottom foldLeft e-9",
        "g30 cutBottom s+15", "g31 cutBottom foldLeft e-15", "g32 cutBottom cutLeft s+13", "g33 cutBottom foldLeft e-13",
        "g40 cutBottom s+19", "g41 cutBottom foldLeft e-19", "g42 cutBottom cutLeft s+17", "g43 cutBottom foldLeft e-17",
        "g50 s+23", "g51 foldLeft e-23", "g52 cutLeft s+21", "g53 foldLeft e-21",
      ],
    ],
  },
  "24th/double/landscape/top": {
    grid: "twfr-lnd", portraitPaper: true, pagesPerSheet: 48,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g20 foldBottom e-8", "g21 foldBottom cutLeft e-10", "g22 foldBottom cutLeft e-12", "g23 foldBottom cutLeft e-14",
        "g30 cutBottom s+8", "g31 cutBottom cutLeft s+10", "g32 cutBottom cutLeft s+12", "g33 cutBottom cutLeft s+14",
        "g40 foldBottom e-16", "g41 foldBottom cutLeft e-18", "g42 foldBottom cutLeft e-20", "g43 foldBottom cutLeft e-22",
        "g50 s+16", "g51 cutLeft s+18", "g52 cutLeft s+20", "g53 cutLeft s+22",
      ],
      [
        "g00 r foldTop e-7", "g01 r foldTop cutRight e-5", "g02 r foldTop cutRight e-3", "g03 r foldTop cutRight e-1",
        "g10 r cutTop s+7", "g11 r cutTop cutRight s+5", "g12 r cutTop cutRight s+3", "g13 r cutTop cutRight s+1",
        "g20 r foldTop e-15", "g21 r foldTop cutRight e-13", "g22 r foldTop cutRight e-11", "g23 r foldTop cutRight e-9",
        "g30 r cutTop s+15", "g31 r cutTop cutRight s+13", "g32 r cutTop cutRight s+11", "g33 r cutTop cutRight s+9",
        "g40 r foldTop e-23", "g41 r foldTop cutRight e-21", "g42 r foldTop cutRight e-19", "g43 r foldTop cutRight e-17",
        "g50 r s+23", "g51 r cutRight s+21", "g52 r cutRight s+19", "g53 r cutRight s+17",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "32nd/single/portrait/side": {
    grid: "thtw-por", portraitPaper: false, pagesPerSheet: 32, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-15", "g01 r cutTop foldRight s+15", "g02 r cutTop foldRight s+14", "g03 r cutTop foldRight s+13",
        "g04 r cutTop foldRight s+12", "g05 r cutTop foldRight s+11", "g06 r cutTop foldRight s+10", "g07 r foldTop foldRight s+9",
        "g10 cutBottom e-14", "g11 cutBottom foldLeft e-13", "g12 cutBottom foldLeft e-12", "g13 foldBottom foldLeft e-11",
        "g14 foldBottom cutLeft s+5", "g15 cutBottom foldLeft s+6", "g16 cutBottom foldLeft s+7", "g17 cutBottom foldLeft s+8",
        "g20 r foldTop e-7", "g21 r cutTop foldRight e-8", "g22 r cutTop foldRight e-9", "g23 r cutTop foldRight e-10",
        "g24 r cutTop cutRight s+4", "g25 r cutTop foldRight s+3", "g26 r cutTop foldRight s+2", "g27 r foldTop foldRight s+1",
        "g30 e-6", "g31 foldLeft e-5", "g32 foldLeft e-4", "g33 foldLeft e-3",
        "g34 foldLeft e-2", "g35 foldLeft e-1", "g36 foldLeft e", "g37 foldLeft s",
      ],
    ],
  },
  "32nd/single/portrait/top": {
    grid: "thtw-por", portraitPaper: false, pagesPerSheet: 32, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-15", "g01 foldBottom foldLeft e-14", "g02 r foldTop cutRight e-11", "g03 foldBottom foldLeft e-10",
        "g04 r foldTop cutRight e-7", "g05 foldBottom foldLeft e-6", "g06 r foldTop cutRight e-3", "g07 foldBottom foldLeft e-2",
        "g10 r foldTop s+15", "g11 cutBottom cutLeft e-13", "g12 r cutTop foldRight e-12", "g13 cutBottom cutLeft e-9",
        "g14 r cutTop foldRight e-8", "g15 cutBottom cutLeft e-5", "g16 r cutTop foldRight e-4", "g17 foldBottom cutLeft e-1",
        "g20 r foldTop s+14", "g21 foldBottom cutLeft s+11", "g22 r foldTop foldRight s+10", "g23 foldBottom cutLeft s+7",
        "g24 r foldTop foldRight s+6", "g25 foldBottom cutLeft s+3", "g26 r foldTop foldRight s+2", "g27 foldBottom cutLeft e",
        "g30 r s+13", "g31 foldLeft s+12", "g32 r cutRight s+9", "g33 foldLeft s+8",
        "g34 r cutRight s+5", "g35 foldLeft s+4", "g36 r cutRight s+1", "g37 foldLeft s",
      ],
    ],
    backCover: [{ side: 0, cell: 23, spec: "g27 r foldTop cutRight e" }],
  },
  "32nd/single/landscape/side": {
    grid: "thtw-lnd", portraitPaper: true, pagesPerSheet: 32, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-2", "g01 cutBottom foldLeft e-1", "g02 cutBottom foldLeft e", "g03 foldBottom foldLeft s",
        "g10 r cutTop e-3", "g11 r foldTop foldRight e-4", "g12 r foldTop cutRight s+2", "g13 r cutTop foldRight s+1",
        "g20 foldBottom e-6", "g21 cutBottom foldLeft e-5", "g22 cutBottom cutLeft s+3", "g23 foldBottom foldLeft s+4",
        "g30 r cutTop e-7", "g31 r foldTop foldRight e-8", "g32 r foldTop cutRight s+6", "g33 r cutTop foldRight s+5",
        "g40 foldBottom e-10", "g41 cutBottom foldLeft e-9", "g42 cutBottom cutLeft s+7", "g43 foldBottom foldLeft s+8",
        "g50 r cutTop e-11", "g51 r foldTop foldRight e-12", "g52 r foldTop cutRight s+10", "g53 r cutTop foldRight s+9",
        "g60 foldBottom e-14", "g61 cutBottom foldLeft e-13", "g62 cutBottom cutLeft s+11", "g63 foldBottom foldLeft s+12",
        "g70 r e-15", "g71 r foldRight s+15", "g72 r foldRight s+14", "g73 r foldRight s+13",
      ],
    ],
  },
  "32nd/single/landscape/top": {
    grid: "thtw-lnd", portraitPaper: true, pagesPerSheet: 32, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-6", "g01 r foldTop foldRight e-7", "g02 foldBottom cutLeft e-14", "g03 r foldTop foldRight e-15",
        "g10 foldBottom e-5", "g11 r foldTop cutRight e-8", "g12 foldBottom cutLeft e-13", "g13 r foldTop cutRight s+15",
        "g20 foldBottom e-4", "g21 r foldTop cutRight e-9", "g22 foldBottom cutLeft e-12", "g23 r foldTop cutRight s+14",
        "g30 foldBottom e-3", "g31 r cutTop cutRight e-10", "g32 cutBottom foldLeft e-11", "g33 r foldTop cutRight s+13",
        "g40 foldBottom e-2", "g41 r foldTop cutRight s+4", "g42 foldBottom foldLeft s+5", "g43 r foldTop cutRight s+12",
        "g50 foldBottom e-1", "g51 r foldTop cutRight s+3", "g52 foldBottom cutLeft s+6", "g53 r foldTop cutRight s+11",
        "g60 foldBottom e", "g61 r foldTop cutRight s+2", "g62 foldBottom cutLeft s+7", "g63 r foldTop cutRight s+10",
        "g70 s", "g71 r foldRight s+1", "g72 cutLeft s+8", "g73 r foldRight s+9",
      ],
    ],
    backCover: [{ side: 0, cell: 24, spec: "g60 r foldTop e" }],
  },
  "32nd/double/portrait/side": {
    grid: "thtw-por", portraitPaper: false, pagesPerSheet: 64,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g06 cutBottom cutLeft e-6", "g07 cutBottom foldLeft s+6",
        "g10 cutBottom e-8", "g11 cutBottom foldLeft s+8", "g12 cutBottom cutLeft e-10", "g13 cutBottom foldLeft s+10",
        "g14 cutBottom cutLeft e-12", "g15 cutBottom foldLeft s+12", "g16 cutBottom cutLeft e-14", "g17 cutBottom foldLeft s+14",
        "g20 cutBottom e-16", "g21 cutBottom foldLeft s+16", "g22 cutBottom cutLeft e-18", "g23 cutBottom foldLeft s+18",
        "g24 cutBottom cutLeft e-20", "g25 cutBottom foldLeft s+20", "g26 cutBottom cutLeft e-22", "g27 cutBottom foldLeft s+22",
        "g30 e-24", "g31 foldLeft s+24", "g32 cutLeft e-26", "g33 foldLeft s+26",
        "g34 cutLeft e-28", "g35 foldLeft s+28", "g36 cutLeft e-30", "g37 foldLeft s+30",
      ],
      [
        "g00 cutBottom s+7", "g01 cutBottom foldLeft e-7", "g02 cutBottom cutLeft s+5", "g03 cutBottom foldLeft e-5",
        "g04 cutBottom cutLeft s+3", "g05 cutBottom foldLeft e-3", "g06 cutBottom cutLeft s+1", "g07 cutBottom foldLeft e-1",
        "g10 cutBottom s+15", "g11 cutBottom foldLeft e-15", "g12 cutBottom cutLeft s+13", "g13 cutBottom foldLeft e-13",
        "g14 cutBottom cutLeft s+11", "g15 cutBottom foldLeft e-11", "g16 cutBottom cutLeft s+9", "g17 cutBottom foldLeft e-9",
        "g20 cutBottom s+23", "g21 cutBottom foldLeft e-23", "g22 cutBottom cutLeft s+21", "g23 cutBottom foldLeft e-21",
        "g24 cutBottom cutLeft s+19", "g25 cutBottom foldLeft e-19", "g26 cutBottom cutLeft s+17", "g27 cutBottom foldLeft e-17",
        "g30 s+31", "g31 foldLeft e-31", "g32 cutLeft s+29", "g33 foldLeft e-29",
        "g34 cutLeft s+27", "g35 foldLeft e-27", "g36 cutLeft s+25", "g37 foldLeft e-25",
      ],
    ],
  },
  "32nd/double/portrait/top": {
    grid: "thtw-por", portraitPaper: false, pagesPerSheet: 64,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g06 foldBottom cutLeft e-12", "g07 foldBottom cutLeft e-14",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10", "g16 cutBottom cutLeft s+12", "g17 cutBottom cutLeft s+14",
        "g20 foldBottom e-16", "g21 foldBottom cutLeft e-18", "g22 foldBottom cutLeft e-20", "g23 foldBottom cutLeft e-22",
        "g24 foldBottom cutLeft e-24", "g25 foldBottom cutLeft e-26", "g26 foldBottom cutLeft e-28", "g27 foldBottom cutLeft e-30",
        "g30 s+16", "g31 cutLeft s+18", "g32 cutLeft s+20", "g33 cutLeft s+22",
        "g34 cutLeft s+24", "g35 cutLeft s+26", "g36 cutLeft s+28", "g37 cutLeft s+30",
      ],
      [
        "g00 r foldTop e-15", "g01 r foldTop cutRight e-13", "g02 r foldTop cutRight e-11", "g03 r foldTop cutRight e-9",
        "g04 r foldTop cutRight e-7", "g05 r foldTop cutRight e-5", "g06 r foldTop cutRight e-3", "g07 r foldTop cutRight e-1",
        "g10 r cutTop s+15", "g11 r cutTop cutRight s+13", "g12 r cutTop cutRight s+11", "g13 r cutTop cutRight s+9",
        "g14 r cutTop cutRight s+7", "g15 r cutTop cutRight s+5", "g16 r cutTop cutRight s+3", "g17 r cutTop cutRight s+1",
        "g20 r foldTop e-31", "g21 r foldTop cutRight e-29", "g22 r foldTop cutRight e-27", "g23 r foldTop cutRight e-25",
        "g24 r foldTop cutRight e-23", "g25 r foldTop cutRight e-21", "g26 r foldTop cutRight e-19", "g27 r foldTop cutRight e-17",
        "g30 r s+31", "g31 r cutRight s+29", "g32 r cutRight s+27", "g33 r cutRight s+25",
        "g34 r cutRight s+23", "g35 r cutRight s+21", "g36 r cutRight s+19", "g37 r cutRight s+17",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "32nd/double/landscape/side": {
    grid: "thtw-lnd", portraitPaper: true, pagesPerSheet: 64,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g10 cutBottom e-4", "g11 cutBottom foldLeft s+4", "g12 cutBottom cutLeft e-6", "g13 cutBottom foldLeft s+6",
        "g20 cutBottom e-8", "g21 cutBottom foldLeft s+8", "g22 cutBottom cutLeft e-10", "g23 cutBottom foldLeft s+10",
        "g30 cutBottom e-12", "g31 cutBottom foldLeft s+12", "g32 cutBottom cutLeft e-14", "g33 cutBottom foldLeft s+14",
        "g40 cutBottom e-16", "g41 cutBottom foldLeft s+16", "g42 cutBottom cutLeft e-18", "g43 cutBottom foldLeft s+18",
        "g50 cutBottom e-20", "g51 cutBottom foldLeft s+20", "g52 cutBottom cutLeft e-22", "g53 cutBottom foldLeft s+22",
        "g60 cutBottom e-24", "g61 cutBottom foldLeft s+24", "g62 cutBottom cutLeft e-26", "g63 cutBottom foldLeft s+26",
        "g70 e-28", "g71 foldLeft s+28", "g72 cutLeft e-30", "g73 foldLeft s+30",
      ],
      [
        "g00 cutBottom s+3", "g01 cutBottom foldLeft e-3", "g02 cutBottom cutLeft s+1", "g03 cutBottom foldLeft e-1",
        "g10 cutBottom s+7", "g11 cutBottom foldLeft e-7", "g12 cutBottom cutLeft s+5", "g13 cutBottom foldLeft e-5",
        "g20 cutBottom s+11", "g21 cutBottom foldLeft e-11", "g22 cutBottom cutLeft s+9", "g23 cutBottom foldLeft e-9",
        "g30 cutBottom s+15", "g31 cutBottom foldLeft e-15", "g32 cutBottom cutLeft s+13", "g33 cutBottom foldLeft e-13",
        "g40 cutBottom s+19", "g41 cutBottom foldLeft e-19", "g42 cutBottom cutLeft s+17", "g43 cutBottom foldLeft e-17",
        "g50 cutBottom s+23", "g51 cutBottom foldLeft e-23", "g52 cutBottom cutLeft s+21", "g53 cutBottom foldLeft e-21",
        "g60 cutBottom s+27", "g61 cutBottom foldLeft e-27", "g62 cutBottom cutLeft s+25", "g63 cutBottom foldLeft e-25",
        "g70 s+31", "g71 foldLeft e-31", "g72 cutLeft s+29", "g73 foldLeft e-29",
      ],
    ],
  },
  "32nd/double/landscape/top": {
    grid: "thtw-lnd", portraitPaper: true, pagesPerSheet: 64,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g20 foldBottom e-8", "g21 foldBottom cutLeft e-10", "g22 foldBottom cutLeft e-12", "g23 foldBottom cutLeft e-14",
        "g30 cutBottom s+8", "g31 cutBottom cutLeft s+10", "g32 cutBottom cutLeft s+12", "g33 cutBottom cutLeft s+14",
        "g40 foldBottom e-16", "g41 foldBottom cutLeft e-18", "g42 foldBottom cutLeft e-20", "g43 foldBottom cutLeft e-22",
        "g50 cutBottom s+16", "g51 cutBottom cutLeft s+18", "g52 cutBottom cutLeft s+20", "g53 cutBottom cutLeft s+22",
        "g60 foldBottom e-24", "g61 foldBottom cutLeft e-26", "g62 foldBottom cutLeft e-28", "g63 foldBottom cutLeft e-30",
        "g70 s+24", "g71 cutLeft s+26", "g72 cutLeft s+28", "g73 cutLeft s+30",
      ],
      [
        "g00 r foldTop e-7", "g01 r foldTop cutRight e-5", "g02 r foldTop cutRight e-3", "g03 r foldTop cutRight e-1",
        "g10 r cutTop s+7", "g11 r cutTop cutRight s+5", "g12 r cutTop cutRight s+3", "g13 r cutTop cutRight s+1",
        "g20 r foldTop e-15", "g21 r foldTop cutRight e-13", "g22 r foldTop cutRight e-11", "g23 r foldTop cutRight e-9",
        "g30 r cutTop s+15", "g31 r cutTop cutRight s+13", "g32 r cutTop cutRight s+11", "g33 r cutTop cutRight s+9",
        "g40 r foldTop e-23", "g41 r foldTop cutRight e-21", "g42 r foldTop cutRight e-19", "g43 r foldTop cutRight e-17",
        "g50 r cutTop s+23", "g51 r cutTop cutRight s+21", "g52 r cutTop cutRight s+19", "g53 r cutTop cutRight s+17",
        "g60 r foldTop e-31", "g61 r foldTop cutRight e-29", "g62 r foldTop cutRight e-27", "g63 r foldTop cutRight e-25",
        "g70 r s+31", "g71 r cutRight s+29", "g72 r cutRight s+27", "g73 r cutRight s+25",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "36th/single/portrait/side": {
    grid: "thsx-por", portraitPaper: true, pagesPerSheet: 36, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-13", "g01 r cutTop foldRight e-14", "g02 r cutTop foldRight e-15", "g03 r cutTop foldRight e-16",
        "g04 r cutTop foldRight e-17", "g05 r foldTop foldRight s+17", "g10 cutBottom e-12", "g11 foldBottom foldLeft e-11",
        "g12 foldBottom cutLeft s+13", "g13 cutBottom foldLeft s+14", "g14 cutBottom foldLeft s+15", "g15 cutBottom foldLeft s+16",
        "g20 r foldTop e-9", "g21 r cutTop foldRight e-10", "g22 r cutTop cutRight s+12", "g23 r cutTop foldRight s+11",
        "g24 r cutTop foldRight s+10", "g25 r foldTop foldRight s+9", "g30 cutBottom e-8", "g31 foldBottom foldLeft e-7",
        "g32 foldBottom cutLeft s+5", "g33 cutBottom foldLeft s+6", "g34 cutBottom foldLeft s+7", "g35 cutBottom foldLeft s+8",
        "g40 r foldTop e-5", "g41 r cutTop foldRight e-6", "g42 r cutTop cutRight s+4", "g43 r cutTop foldRight s+3",
        "g44 r cutTop foldRight s+2", "g45 r foldTop foldRight s+1", "g50 e-4", "g51 foldLeft e-3",
        "g52 foldLeft e-2", "g53 foldLeft e-1", "g54 foldLeft e", "g55 foldLeft s",
      ],
    ],
  },
  "36th/single/portrait/top": {
    grid: "thsx-por", portraitPaper: true, pagesPerSheet: 36, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-4", "g01 r foldTop foldRight e-5", "g02 foldBottom cutLeft e-8", "g03 r foldTop foldRight e-9",
        "g04 foldBottom cutLeft e-12", "g05 r foldTop foldRight e-13", "g10 foldBottom e-3", "g11 r cutTop cutRight e-6",
        "g12 cutBottom foldLeft e-7", "g13 r cutTop cutRight e-10", "g14 cutBottom foldLeft e-11", "g15 r foldTop cutRight e-14",
        "g20 foldBottom e-2", "g21 r foldTop cutRight s+4", "g22 foldBottom foldLeft s+5", "g23 r foldTop cutRight s+12",
        "g24 foldBottom foldLeft s+13", "g25 r foldTop cutRight e-15", "g30 foldBottom e-1", "g31 r foldTop cutRight s+3",
        "g32 foldBottom cutLeft s+6", "g33 r foldTop cutRight s+11", "g34 foldBottom cutLeft s+14", "g35 r foldTop cutRight e-16",
        "g40 foldBottom e", "g41 r foldTop cutRight s+2", "g42 foldBottom cutLeft s+7", "g43 r foldTop cutRight s+10",
        "g44 foldBottom cutLeft s+15", "g45 r foldTop cutRight e-17", "g50 s", "g51 r foldRight s+1",
        "g52 cutLeft s+8", "g53 r foldRight s+9", "g54 cutLeft s+16", "g55 r foldRight s+17",
      ],
    ],
    backCover: [{ side: 0, cell: 24, spec: "g40 r foldTop e" }],
  },
  "36th/single/landscape/side": {
    grid: "thsx-lnd", portraitPaper: false, pagesPerSheet: 36, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-13", "g01 r cutTop foldRight e-14", "g02 r cutTop foldRight e-15", "g03 r cutTop foldRight e-16",
        "g04 r cutTop foldRight e-17", "g05 r foldTop foldRight s+17", "g10 cutBottom e-12", "g11 foldBottom foldLeft e-11",
        "g12 foldBottom cutLeft s+13", "g13 cutBottom foldLeft s+14", "g14 cutBottom foldLeft s+15", "g15 cutBottom foldLeft s+16",
        "g20 r foldTop e-9", "g21 r cutTop foldRight e-10", "g22 r cutTop cutRight s+12", "g23 r cutTop foldRight s+11",
        "g24 r cutTop foldRight s+10", "g25 r foldTop foldRight s+9", "g30 cutBottom e-8", "g31 foldBottom foldLeft e-7",
        "g32 foldBottom cutLeft s+5", "g33 cutBottom foldLeft s+6", "g34 cutBottom foldLeft s+7", "g35 cutBottom foldLeft s+8",
        "g40 r foldTop e-5", "g41 r cutTop foldRight e-6", "g42 r cutTop cutRight s+4", "g43 r cutTop foldRight s+3",
        "g44 r cutTop foldRight s+2", "g45 r foldTop foldRight s+1", "g50 e-4", "g51 foldLeft e-3",
        "g52 foldLeft e-2", "g53 foldLeft e-1", "g54 foldLeft e", "g55 foldLeft s",
      ],
    ],
  },
  "36th/single/landscape/top": {
    grid: "thsx-lnd", portraitPaper: false, pagesPerSheet: 36, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-4", "g01 r foldTop foldRight e-5", "g02 foldBottom cutLeft e-8", "g03 r foldTop foldRight e-9",
        "g04 foldBottom cutLeft e-12", "g05 r foldTop foldRight e-13", "g10 foldBottom e-3", "g11 r cutTop cutRight e-6",
        "g12 cutBottom foldLeft e-7", "g13 r cutTop cutRight e-10", "g14 cutBottom foldLeft e-11", "g15 r foldTop cutRight e-14",
        "g20 foldBottom e-2", "g21 r foldTop cutRight s+4", "g22 foldBottom foldLeft s+5", "g23 r foldTop cutRight s+12",
        "g24 foldBottom foldLeft s+13", "g25 r foldTop cutRight e-15", "g30 foldBottom e-1", "g31 r foldTop cutRight s+3",
        "g32 foldBottom cutLeft s+6", "g33 r foldTop cutRight s+11", "g34 foldBottom cutLeft s+14", "g35 r foldTop cutRight e-16",
        "g40 foldBottom e", "g41 r foldTop cutRight s+2", "g42 foldBottom cutLeft s+7", "g43 r foldTop cutRight s+10",
        "g44 foldBottom cutLeft s+15", "g45 r foldTop cutRight e-17", "g50 s", "g51 r foldRight s+1",
        "g52 cutLeft s+8", "g53 r foldRight s+9", "g54 cutLeft s+16", "g55 r foldRight s+17",
      ],
    ],
    backCover: [{ side: 0, cell: 24, spec: "g40 r foldTop e" }],
  },
  "36th/double/portrait/side": {
    grid: "thsx-por", portraitPaper: true, pagesPerSheet: 72,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g10 cutBottom e-6", "g11 cutBottom foldLeft s+6",
        "g12 cutBottom cutLeft e-8", "g13 cutBottom foldLeft s+8", "g14 cutBottom cutLeft e-10", "g15 cutBottom foldLeft s+10",
        "g20 cutBottom e-12", "g21 cutBottom foldLeft s+12", "g22 cutBottom cutLeft e-14", "g23 cutBottom foldLeft s+14",
        "g24 cutBottom cutLeft e-16", "g25 cutBottom foldLeft s+16", "g30 cutBottom e-18", "g31 cutBottom foldLeft s+18",
        "g32 cutBottom cutLeft e-20", "g33 cutBottom foldLeft s+20", "g34 cutBottom cutLeft e-22", "g35 cutBottom foldLeft s+22",
        "g40 cutBottom e-24", "g41 cutBottom foldLeft s+24", "g42 cutBottom cutLeft e-26", "g43 cutBottom foldLeft s+26",
        "g44 cutBottom cutLeft e-28", "g45 cutBottom foldLeft s+28", "g50 e-30", "g51 foldLeft s+30",
        "g52 cutLeft e-32", "g53 foldLeft s+32", "g54 cutLeft e-34", "g55 foldLeft s+34",
      ],
      [
        "g00 cutBottom s+5", "g01 cutBottom foldLeft e-5", "g02 cutBottom cutLeft s+3", "g03 cutBottom foldLeft e-3",
        "g04 cutBottom cutLeft s+1", "g05 cutBottom foldLeft e-1", "g10 cutBottom s+11", "g11 cutBottom foldLeft e-11",
        "g12 cutBottom cutLeft s+9", "g13 cutBottom foldLeft e-9", "g14 cutBottom cutLeft s+7", "g15 cutBottom foldLeft e-7",
        "g20 cutBottom s+17", "g21 cutBottom foldLeft e-17", "g22 cutBottom cutLeft s+15", "g23 cutBottom foldLeft e-15",
        "g24 cutBottom cutLeft s+13", "g25 cutBottom foldLeft e-13", "g30 cutBottom s+23", "g31 cutBottom foldLeft e-23",
        "g32 cutBottom cutLeft s+21", "g33 cutBottom foldLeft e-21", "g34 cutBottom cutLeft s+19", "g35 cutBottom foldLeft e-19",
        "g40 cutBottom s+29", "g41 cutBottom foldLeft e-29", "g42 cutBottom cutLeft s+27", "g43 cutBottom foldLeft e-27",
        "g44 cutBottom cutLeft s+25", "g45 cutBottom foldLeft e-25", "g50 s+35", "g51 foldLeft e-35",
        "g52 cutLeft s+33", "g53 foldLeft e-33", "g54 cutLeft s+31", "g55 foldLeft e-31",
      ],
    ],
  },
  "36th/double/portrait/top": {
    grid: "thsx-por", portraitPaper: true, pagesPerSheet: 72,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g10 cutBottom s", "g11 cutBottom cutLeft s+2",
        "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6", "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10",
        "g20 foldBottom e-12", "g21 foldBottom cutLeft e-14", "g22 foldBottom cutLeft e-16", "g23 foldBottom cutLeft e-18",
        "g24 foldBottom cutLeft e-20", "g25 foldBottom cutLeft e-22", "g30 cutBottom s+12", "g31 cutBottom cutLeft s+14",
        "g32 cutBottom cutLeft s+16", "g33 cutBottom cutLeft s+18", "g34 cutBottom cutLeft s+20", "g35 cutBottom cutLeft s+22",
        "g40 foldBottom e-24", "g41 foldBottom cutLeft e-26", "g42 foldBottom cutLeft e-28", "g43 foldBottom cutLeft e-30",
        "g44 foldBottom cutLeft e-32", "g45 foldBottom cutLeft e-34", "g50 s+24", "g51 cutLeft s+26",
        "g52 cutLeft s+28", "g53 cutLeft s+30", "g54 cutLeft s+32", "g55 cutLeft s+34",
      ],
      [
        "g00 r foldTop e-11", "g01 r foldTop cutRight e-9", "g02 r foldTop cutRight e-7", "g03 r foldTop cutRight e-5",
        "g04 r foldTop cutRight e-3", "g05 r foldTop cutRight e-1", "g10 r cutTop s+11", "g11 r cutTop cutRight s+9",
        "g12 r cutTop cutRight s+7", "g13 r cutTop cutRight s+5", "g14 r cutTop cutRight s+3", "g15 r cutTop cutRight s+1",
        "g20 r foldTop e-23", "g21 r foldTop cutRight e-21", "g22 r foldTop cutRight e-19", "g23 r foldTop cutRight e-17",
        "g24 r foldTop cutRight e-15", "g25 r foldTop cutRight e-13", "g30 r cutTop s+23", "g31 r cutTop cutRight s+21",
        "g32 r cutTop cutRight s+19", "g33 r cutTop cutRight s+17", "g34 r cutTop cutRight s+15", "g35 r cutTop cutRight s+13",
        "g40 r foldTop e-35", "g41 r foldTop cutRight e-33", "g42 r foldTop cutRight e-31", "g43 r foldTop cutRight e-29",
        "g44 r foldTop cutRight e-27", "g45 r foldTop cutRight e-25", "g50 r s+35", "g51 r cutRight s+33",
        "g52 r cutRight s+31", "g53 r cutRight s+29", "g54 r cutRight s+27", "g55 r cutRight s+25",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "36th/double/landscape/side": {
    grid: "thsx-lnd", portraitPaper: false, pagesPerSheet: 72,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g10 cutBottom e-6", "g11 cutBottom foldLeft s+6",
        "g12 cutBottom cutLeft e-8", "g13 cutBottom foldLeft s+8", "g14 cutBottom cutLeft e-10", "g15 cutBottom foldLeft s+10",
        "g20 cutBottom e-12", "g21 cutBottom foldLeft s+12", "g22 cutBottom cutLeft e-14", "g23 cutBottom foldLeft s+14",
        "g24 cutBottom cutLeft e-16", "g25 cutBottom foldLeft s+16", "g30 cutBottom e-18", "g31 cutBottom foldLeft s+18",
        "g32 cutBottom cutLeft e-20", "g33 cutBottom foldLeft s+20", "g34 cutBottom cutLeft e-22", "g35 cutBottom foldLeft s+22",
        "g40 cutBottom e-24", "g41 cutBottom foldLeft s+24", "g42 cutBottom cutLeft e-26", "g43 cutBottom foldLeft s+26",
        "g44 cutBottom cutLeft e-28", "g45 cutBottom foldLeft s+28", "g50 e-30", "g51 foldLeft s+30",
        "g52 cutLeft e-32", "g53 foldLeft s+32", "g54 cutLeft e-34", "g55 foldLeft s+34",
      ],
      [
        "g00 cutBottom s+5", "g01 cutBottom foldLeft e-5", "g02 cutBottom cutLeft s+3", "g03 cutBottom foldLeft e-3",
        "g04 cutBottom cutLeft s+1", "g05 cutBottom foldLeft e-1", "g10 cutBottom s+11", "g11 cutBottom foldLeft e-11",
        "g12 cutBottom cutLeft s+9", "g13 cutBottom foldLeft e-9", "g14 cutBottom cutLeft s+7", "g15 cutBottom foldLeft e-7",
        "g20 cutBottom s+17", "g21 cutBottom foldLeft e-17", "g22 cutBottom cutLeft s+15", "g23 cutBottom foldLeft e-15",
        "g24 cutBottom cutLeft s+13", "g25 cutBottom foldLeft e-13", "g30 cutBottom s+23", "g31 cutBottom foldLeft e-23",
        "g32 cutBottom cutLeft s+21", "g33 cutBottom foldLeft e-21", "g34 cutBottom cutLeft s+19", "g35 cutBottom foldLeft e-19",
        "g40 cutBottom s+29", "g41 cutBottom foldLeft e-29", "g42 cutBottom cutLeft s+27", "g43 cutBottom foldLeft e-27",
        "g44 cutBottom cutLeft s+25", "g45 cutBottom foldLeft e-25", "g50 s+35", "g51 foldLeft e-35",
        "g52 cutLeft s+33", "g53 foldLeft e-33", "g54 cutLeft s+31", "g55 foldLeft e-31",
      ],
    ],
  },
  "36th/double/landscape/top": {
    grid: "thsx-lnd", portraitPaper: false, pagesPerSheet: 72,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g10 cutBottom s", "g11 cutBottom cutLeft s+2",
        "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6", "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10",
        "g20 foldBottom e-12", "g21 foldBottom cutLeft e-14", "g22 foldBottom cutLeft e-16", "g23 foldBottom cutLeft e-18",
        "g24 foldBottom cutLeft e-20", "g25 foldBottom cutLeft e-22", "g30 cutBottom s+12", "g31 cutBottom cutLeft s+14",
        "g32 cutBottom cutLeft s+16", "g33 cutBottom cutLeft s+18", "g34 cutBottom cutLeft s+20", "g35 cutBottom cutLeft s+22",
        "g40 foldBottom e-24", "g41 foldBottom cutLeft e-26", "g42 foldBottom cutLeft e-28", "g43 foldBottom cutLeft e-30",
        "g44 foldBottom cutLeft e-32", "g45 foldBottom cutLeft e-34", "g50 s+24", "g51 cutLeft s+26",
        "g52 cutLeft s+28", "g53 cutLeft s+30", "g54 cutLeft s+32", "g55 cutLeft s+34",
      ],
      [
        "g00 r foldTop e-11", "g01 r foldTop cutRight e-9", "g02 r foldTop cutRight e-7", "g03 r foldTop cutRight e-5",
        "g04 r foldTop cutRight e-3", "g05 r foldTop cutRight e-1", "g10 r cutTop s+11", "g11 r cutTop cutRight s+9",
        "g12 r cutTop cutRight s+7", "g13 r cutTop cutRight s+5", "g14 r cutTop cutRight s+3", "g15 r cutTop cutRight s+1",
        "g20 r foldTop e-23", "g21 r foldTop cutRight e-21", "g22 r foldTop cutRight e-19", "g23 r foldTop cutRight e-17",
        "g24 r foldTop cutRight e-15", "g25 r foldTop cutRight e-13", "g30 r cutTop s+23", "g31 r cutTop cutRight s+21",
        "g32 r cutTop cutRight s+19", "g33 r cutTop cutRight s+17", "g34 r cutTop cutRight s+15", "g35 r cutTop cutRight s+13",
        "g40 r foldTop e-35", "g41 r foldTop cutRight e-33", "g42 r foldTop cutRight e-31", "g43 r foldTop cutRight e-29",
        "g44 r foldTop cutRight e-27", "g45 r foldTop cutRight e-25", "g50 r s+35", "g51 r cutRight s+33",
        "g52 r cutRight s+31", "g53 r cutRight s+29", "g54 r cutRight s+27", "g55 r cutRight s+25",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "48th/single/portrait/side": {
    grid: "frei-por", portraitPaper: false, pagesPerSheet: 48, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-23", "g01 r cutTop foldRight s+23", "g02 r cutTop foldRight s+22", "g03 r cutTop foldRight s+21",
        "g04 r cutTop foldRight s+20", "g05 r cutTop foldRight s+19", "g06 r cutTop foldRight s+18", "g07 r foldTop foldRight s+17",
        "g10 cutBottom e-22", "g11 cutBottom foldLeft e-21", "g12 cutBottom foldLeft e-20", "g13 foldBottom foldLeft e-19",
        "g14 foldBottom cutLeft s+13", "g15 cutBottom foldLeft s+14", "g16 cutBottom foldLeft s+15", "g17 cutBottom foldLeft s+16",
        "g20 r foldTop e-15", "g21 r cutTop foldRight e-16", "g22 r cutTop foldRight e-17", "g23 r cutTop foldRight e-18",
        "g24 r cutTop cutRight s+12", "g25 r cutTop foldRight s+11", "g26 r cutTop foldRight s+10", "g27 r foldTop foldRight s+9",
        "g30 cutBottom e-14", "g31 cutBottom foldLeft e-13", "g32 cutBottom foldLeft e-12", "g33 foldBottom foldLeft e-11",
        "g34 foldBottom cutLeft s+5", "g35 cutBottom foldLeft s+6", "g36 cutBottom foldLeft s+7", "g37 cutBottom foldLeft s+8",
        "g40 r foldTop e-7", "g41 r cutTop foldRight e-8", "g42 r cutTop foldRight e-9", "g43 r cutTop foldRight e-10",
        "g44 r cutTop cutRight s+4", "g45 r cutTop foldRight s+3", "g46 r cutTop foldRight s+2", "g47 r foldTop foldRight s+1",
        "g50 e-6", "g51 foldLeft e-5", "g52 foldLeft e-4", "g53 foldLeft e-3",
        "g54 foldLeft e-2", "g55 foldLeft e-1", "g56 foldLeft e", "g57 foldLeft s",
      ],
    ],
  },
  "48th/single/portrait/top": {
    grid: "frei-por", portraitPaper: false, pagesPerSheet: 48, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-4", "g01 r foldTop foldRight e-5", "g02 foldBottom cutLeft e-8", "g03 r foldTop foldRight e-9",
        "g04 foldBottom cutLeft e-12", "g05 r foldTop foldRight e-13", "g06 foldBottom cutLeft e-16", "g07 r foldTop foldRight e-17",
        "g10 foldBottom e-3", "g11 r cutTop cutRight e-6", "g12 cutBottom foldLeft e-7", "g13 r cutTop cutRight e-10",
        "g14 cutBottom foldLeft e-11", "g15 r cutTop cutRight e-14", "g16 cutBottom foldLeft e-15", "g17 r foldTop cutRight e-18",
        "g20 foldBottom e-2", "g21 r foldTop cutRight s+4", "g22 foldBottom foldLeft s+5", "g23 r foldTop cutRight s+12",
        "g24 foldBottom foldLeft s+13", "g25 r foldTop cutRight s+20", "g26 foldBottom foldLeft s+21", "g27 r foldTop cutRight e-19",
        "g30 foldBottom e-1", "g31 r foldTop cutRight s+3", "g32 foldBottom cutLeft s+6", "g33 r foldTop cutRight s+11",
        "g34 foldBottom cutLeft s+14", "g35 r foldTop cutRight s+19", "g36 foldBottom cutLeft s+22", "g37 r foldTop cutRight e-20",
        "g40 foldBottom e", "g41 r foldTop cutRight s+2", "g42 foldBottom cutLeft s+7", "g43 r foldTop cutRight s+10",
        "g44 foldBottom cutLeft s+15", "g45 r foldTop cutRight s+18", "g46 foldBottom cutLeft s+23", "g47 r foldTop cutRight e-21",
        "g50 s", "g51 r foldRight s+1", "g52 cutLeft s+8", "g53 r foldRight s+9",
        "g54 cutLeft s+16", "g55 r foldRight s+17", "g56 cutLeft e-23", "g57 r foldRight e-22",
      ],
    ],
    backCover: [{ side: 0, cell: 32, spec: "g40 r foldTop e" }],
  },
  "48th/single/landscape/side": {
    grid: "frei-lnd", portraitPaper: true, pagesPerSheet: 48, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-17", "g01 r cutTop foldRight e-18", "g02 r cutTop foldRight e-19", "g03 r cutTop foldRight e-20",
        "g04 r cutTop foldRight e-21", "g05 r foldTop foldRight e-22", "g10 cutBottom e-16", "g11 foldBottom foldLeft e-15",
        "g12 foldBottom cutLeft s+21", "g13 cutBottom foldLeft s+22", "g14 cutBottom foldLeft s+23", "g15 cutBottom foldLeft e-23",
        "g20 r foldTop e-13", "g21 r cutTop foldRight e-14", "g22 r cutTop cutRight s+20", "g23 r cutTop foldRight s+19",
        "g24 r cutTop foldRight s+18", "g25 r foldTop foldRight s+17", "g30 cutBottom e-12", "g31 foldBottom foldLeft e-11",
        "g32 foldBottom cutLeft s+13", "g33 cutBottom foldLeft s+14", "g34 cutBottom foldLeft s+15", "g35 cutBottom foldLeft s+16",
        "g40 r foldTop e-9", "g41 r cutTop foldRight e-10", "g42 r cutTop cutRight s+12", "g43 r cutTop foldRight s+11",
        "g44 r cutTop foldRight s+10", "g45 r foldTop foldRight s+9", "g50 cutBottom e-8", "g51 foldBottom foldLeft e-7",
        "g52 foldBottom cutLeft s+5", "g53 cutBottom foldLeft s+6", "g54 cutBottom foldLeft s+7", "g55 cutBottom foldLeft s+8",
        "g60 r foldTop e-5", "g61 r cutTop foldRight e-6", "g62 r cutTop cutRight s+4", "g63 r cutTop foldRight s+3",
        "g64 r cutTop foldRight s+2", "g65 r foldTop foldRight s+1", "g70 e-4", "g71 foldLeft e-3",
        "g72 foldLeft e-2", "g73 foldLeft e-1", "g74 foldLeft e", "g75 foldLeft s",
      ],
    ],
  },
  "48th/single/landscape/top": {
    grid: "frei-lnd", portraitPaper: true, pagesPerSheet: 48, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-6", "g01 r foldTop foldRight e-7", "g02 foldBottom cutLeft e-14", "g03 r foldTop foldRight e-15",
        "g04 foldBottom cutLeft e-22", "g05 r foldTop foldRight e-23", "g10 foldBottom e-5", "g11 r foldTop cutRight e-8",
        "g12 foldBottom cutLeft e-13", "g13 r foldTop cutRight e-16", "g14 foldBottom cutLeft e-21", "g15 r foldTop cutRight s+23",
        "g20 foldBottom e-4", "g21 r foldTop cutRight e-9", "g22 foldBottom cutLeft e-12", "g23 r foldTop cutRight e-17",
        "g24 foldBottom cutLeft e-20", "g25 r foldTop cutRight s+22", "g30 foldBottom e-3", "g31 r cutTop cutRight e-10",
        "g32 cutBottom foldLeft e-11", "g33 r cutTop cutRight e-18", "g34 cutBottom foldLeft e-19", "g35 r foldTop cutRight s+21",
        "g40 foldBottom e-2", "g41 r foldTop cutRight s+4", "g42 foldBottom foldLeft s+5", "g43 r foldTop cutRight s+12",
        "g44 foldBottom foldLeft s+13", "g45 r foldTop cutRight s+20", "g50 foldBottom e-1", "g51 r foldTop cutRight s+3",
        "g52 foldBottom cutLeft s+6", "g53 r foldTop cutRight s+11", "g54 foldBottom cutLeft s+14", "g55 r foldTop cutRight s+19",
        "g60 foldBottom e", "g61 r foldTop cutRight s+2", "g62 foldBottom cutLeft s+7", "g63 r foldTop cutRight s+10",
        "g64 foldBottom cutLeft s+15", "g65 r foldTop cutRight s+18", "g70 s", "g71 r foldRight s+1",
        "g72 cutLeft s+8", "g73 r foldRight s+9", "g74 cutLeft s+16", "g75 r foldRight s+17",
      ],
    ],
    backCover: [{ side: 0, cell: 36, spec: "g60 r foldTop e" }],
  },
  "48th/double/portrait/side": {
    grid: "frei-por", portraitPaper: false, pagesPerSheet: 96,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g06 cutBottom cutLeft e-6", "g07 cutBottom foldLeft s+6",
        "g10 cutBottom e-8", "g11 cutBottom foldLeft s+8", "g12 cutBottom cutLeft e-10", "g13 cutBottom foldLeft s+10",
        "g14 cutBottom cutLeft e-12", "g15 cutBottom foldLeft s+12", "g16 cutBottom cutLeft e-14", "g17 cutBottom foldLeft s+14",
        "g20 cutBottom e-16", "g21 cutBottom foldLeft s+16", "g22 cutBottom cutLeft e-18", "g23 cutBottom foldLeft s+18",
        "g24 cutBottom cutLeft e-20", "g25 cutBottom foldLeft s+20", "g26 cutBottom cutLeft e-22", "g27 cutBottom foldLeft s+22",
        "g30 cutBottom e-24", "g31 cutBottom foldLeft s+24", "g32 cutBottom cutLeft e-26", "g33 cutBottom foldLeft s+26",
        "g34 cutBottom cutLeft e-28", "g35 cutBottom foldLeft s+28", "g36 cutBottom cutLeft e-30", "g37 cutBottom foldLeft s+30",
        "g40 cutBottom e-32", "g41 cutBottom foldLeft s+32", "g42 cutBottom cutLeft e-34", "g43 cutBottom foldLeft s+34",
        "g44 cutBottom cutLeft e-36", "g45 cutBottom foldLeft s+36", "g46 cutBottom cutLeft e-38", "g47 cutBottom foldLeft s+38",
        "g50 e-40", "g51 foldLeft s+40", "g52 cutLeft e-42", "g53 foldLeft s+42",
        "g54 cutLeft e-44", "g55 foldLeft s+44", "g56 cutLeft e-46", "g57 foldLeft s+46",
      ],
      [
        "g00 cutBottom s+7", "g01 cutBottom foldLeft e-7", "g02 cutBottom cutLeft s+5", "g03 cutBottom foldLeft e-5",
        "g04 cutBottom cutLeft s+3", "g05 cutBottom foldLeft e-3", "g06 cutBottom cutLeft s+1", "g07 cutBottom foldLeft e-1",
        "g10 cutBottom s+15", "g11 cutBottom foldLeft e-15", "g12 cutBottom cutLeft s+13", "g13 cutBottom foldLeft e-13",
        "g14 cutBottom cutLeft s+11", "g15 cutBottom foldLeft e-11", "g16 cutBottom cutLeft s+9", "g17 cutBottom foldLeft e-9",
        "g20 cutBottom s+23", "g21 cutBottom foldLeft e-23", "g22 cutBottom cutLeft s+21", "g23 cutBottom foldLeft e-21",
        "g24 cutBottom cutLeft s+19", "g25 cutBottom foldLeft e-19", "g26 cutBottom cutLeft s+17", "g27 cutBottom foldLeft e-17",
        "g30 cutBottom s+31", "g31 cutBottom foldLeft e-31", "g32 cutBottom cutLeft s+29", "g33 cutBottom foldLeft e-29",
        "g34 cutBottom cutLeft s+27", "g35 cutBottom foldLeft e-27", "g36 cutBottom cutLeft s+25", "g37 cutBottom foldLeft e-25",
        "g40 cutBottom s+39", "g41 cutBottom foldLeft e-39", "g42 cutBottom cutLeft s+37", "g43 cutBottom foldLeft e-37",
        "g44 cutBottom cutLeft s+35", "g45 cutBottom foldLeft e-35", "g46 cutBottom cutLeft s+33", "g47 cutBottom foldLeft e-33",
        "g50 s+47", "g51 foldLeft e-47", "g52 cutLeft s+45", "g53 foldLeft e-45",
        "g54 cutLeft s+43", "g55 foldLeft e-43", "g56 cutLeft s+41", "g57 foldLeft e-41",
      ],
    ],
  },
  "48th/double/portrait/top": {
    grid: "frei-por", portraitPaper: false, pagesPerSheet: 96,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g06 foldBottom cutLeft e-12", "g07 foldBottom cutLeft e-14",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10", "g16 cutBottom cutLeft s+12", "g17 cutBottom cutLeft s+14",
        "g20 foldBottom e-16", "g21 foldBottom cutLeft e-18", "g22 foldBottom cutLeft e-20", "g23 foldBottom cutLeft e-22",
        "g24 foldBottom cutLeft e-24", "g25 foldBottom cutLeft e-26", "g26 foldBottom cutLeft e-28", "g27 foldBottom cutLeft e-30",
        "g30 cutBottom s+16", "g31 cutBottom cutLeft s+18", "g32 cutBottom cutLeft s+20", "g33 cutBottom cutLeft s+22",
        "g34 cutBottom cutLeft s+24", "g35 cutBottom cutLeft s+26", "g36 cutBottom cutLeft s+28", "g37 cutBottom cutLeft s+30",
        "g40 foldBottom e-32", "g41 foldBottom cutLeft e-34", "g42 foldBottom cutLeft e-36", "g43 foldBottom cutLeft e-38",
        "g44 foldBottom cutLeft e-40", "g45 foldBottom cutLeft e-42", "g46 foldBottom cutLeft e-44", "g47 foldBottom cutLeft e-46",
        "g50 s+32", "g51 cutLeft s+34", "g52 cutLeft s+36", "g53 cutLeft s+38",
        "g54 cutLeft s+40", "g55 cutLeft s+42", "g56 cutLeft s+44", "g57 cutLeft s+46",
      ],
      [
        "g00 r foldTop e-15", "g01 r foldTop cutRight e-13", "g02 r foldTop cutRight e-11", "g03 r foldTop cutRight e-9",
        "g04 r foldTop cutRight e-7", "g05 r foldTop cutRight e-5", "g06 r foldTop cutRight e-3", "g07 r foldTop cutRight e-1",
        "g10 r cutTop s+15", "g11 r cutTop cutRight s+13", "g12 r cutTop cutRight s+11", "g13 r cutTop cutRight s+9",
        "g14 r cutTop cutRight s+7", "g15 r cutTop cutRight s+5", "g16 r cutTop cutRight s+3", "g17 r cutTop cutRight s+1",
        "g20 r foldTop e-31", "g21 r foldTop cutRight e-29", "g22 r foldTop cutRight e-27", "g23 r foldTop cutRight e-25",
        "g24 r foldTop cutRight e-23", "g25 r foldTop cutRight e-21", "g26 r foldTop cutRight e-19", "g27 r foldTop cutRight e-17",
        "g30 r cutTop s+31", "g31 r cutTop cutRight s+29", "g32 r cutTop cutRight s+27", "g33 r cutTop cutRight s+25",
        "g34 r cutTop cutRight s+23", "g35 r cutTop cutRight s+21", "g36 r cutTop cutRight s+19", "g37 r cutTop cutRight s+17",
        "g40 r foldTop e-47", "g41 r foldTop cutRight e-45", "g42 r foldTop cutRight e-43", "g43 r foldTop cutRight e-41",
        "g44 r foldTop cutRight e-39", "g45 r foldTop cutRight e-37", "g46 r foldTop cutRight e-35", "g47 r foldTop cutRight e-33",
        "g50 r s+47", "g51 r cutRight s+45", "g52 r cutRight s+43", "g53 r cutRight s+41",
        "g54 r cutRight s+39", "g55 r cutRight s+37", "g56 r cutRight s+35", "g57 r cutRight s+33",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "48th/double/landscape/side": {
    grid: "frei-lnd", portraitPaper: true, pagesPerSheet: 96,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g10 cutBottom e-6", "g11 cutBottom foldLeft s+6",
        "g12 cutBottom cutLeft e-8", "g13 cutBottom foldLeft s+8", "g14 cutBottom cutLeft e-10", "g15 cutBottom foldLeft s+10",
        "g20 cutBottom e-12", "g21 cutBottom foldLeft s+12", "g22 cutBottom cutLeft e-14", "g23 cutBottom foldLeft s+14",
        "g24 cutBottom cutLeft e-16", "g25 cutBottom foldLeft s+16", "g30 cutBottom e-18", "g31 cutBottom foldLeft s+18",
        "g32 cutBottom cutLeft e-20", "g33 cutBottom foldLeft s+20", "g34 cutBottom cutLeft e-22", "g35 cutBottom foldLeft s+22",
        "g40 cutBottom e-24", "g41 cutBottom foldLeft s+24", "g42 cutBottom cutLeft e-26", "g43 cutBottom foldLeft s+26",
        "g44 cutBottom cutLeft e-28", "g45 cutBottom foldLeft s+28", "g50 cutBottom e-30", "g51 cutBottom foldLeft s+30",
        "g52 cutBottom cutLeft e-32", "g53 cutBottom foldLeft s+32", "g54 cutBottom cutLeft e-34", "g55 cutBottom foldLeft s+34",
        "g60 cutBottom e-36", "g61 cutBottom foldLeft s+36", "g62 cutBottom cutLeft e-38", "g63 cutBottom foldLeft s+38",
        "g64 cutBottom cutLeft e-40", "g65 cutBottom foldLeft s+40", "g70 e-42", "g71 foldLeft s+42",
        "g72 cutLeft e-44", "g73 foldLeft s+44", "g74 cutLeft e-46", "g75 foldLeft s+46",
      ],
      [
        "g00 cutBottom s+5", "g01 cutBottom foldLeft e-5", "g02 cutBottom cutLeft s+3", "g03 cutBottom foldLeft e-3",
        "g04 cutBottom cutLeft s+1", "g05 cutBottom foldLeft e-1", "g10 cutBottom s+11", "g11 cutBottom foldLeft e-11",
        "g12 cutBottom cutLeft s+9", "g13 cutBottom foldLeft e-9", "g14 cutBottom cutLeft s+7", "g15 cutBottom foldLeft e-7",
        "g20 cutBottom s+17", "g21 cutBottom foldLeft e-17", "g22 cutBottom cutLeft s+15", "g23 cutBottom foldLeft e-15",
        "g24 cutBottom cutLeft s+13", "g25 cutBottom foldLeft e-13", "g30 cutBottom s+23", "g31 cutBottom foldLeft e-23",
        "g32 cutBottom cutLeft s+21", "g33 cutBottom foldLeft e-21", "g34 cutBottom cutLeft s+19", "g35 cutBottom foldLeft e-19",
        "g40 cutBottom s+29", "g41 cutBottom foldLeft e-29", "g42 cutBottom cutLeft s+27", "g43 cutBottom foldLeft e-27",
        "g44 cutBottom cutLeft s+25", "g45 cutBottom foldLeft e-25", "g50 cutBottom s+35", "g51 cutBottom foldLeft e-35",
        "g52 cutBottom cutLeft s+33", "g53 cutBottom foldLeft e-33", "g54 cutBottom cutLeft s+31", "g55 cutBottom foldLeft e-31",
        "g60 cutBottom s+41", "g61 cutBottom foldLeft e-41", "g62 cutBottom cutLeft s+39", "g63 cutBottom foldLeft e-39",
        "g64 cutBottom cutLeft s+37", "g65 cutBottom foldLeft e-37", "g70 s+47", "g71 foldLeft e-47",
        "g72 cutLeft s+45", "g73 foldLeft e-45", "g74 cutLeft s+43", "g75 foldLeft e-43",
      ],
    ],
  },
  "48th/double/landscape/top": {
    grid: "frei-lnd", portraitPaper: true, pagesPerSheet: 96,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g10 cutBottom s", "g11 cutBottom cutLeft s+2",
        "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6", "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10",
        "g20 foldBottom e-12", "g21 foldBottom cutLeft e-14", "g22 foldBottom cutLeft e-16", "g23 foldBottom cutLeft e-18",
        "g24 foldBottom cutLeft e-20", "g25 foldBottom cutLeft e-22", "g30 cutBottom s+12", "g31 cutBottom cutLeft s+14",
        "g32 cutBottom cutLeft s+16", "g33 cutBottom cutLeft s+18", "g34 cutBottom cutLeft s+20", "g35 cutBottom cutLeft s+22",
        "g40 foldBottom e-24", "g41 foldBottom cutLeft e-26", "g42 foldBottom cutLeft e-28", "g43 foldBottom cutLeft e-30",
        "g44 foldBottom cutLeft e-32", "g45 foldBottom cutLeft e-34", "g50 cutBottom s+24", "g51 cutBottom cutLeft s+26",
        "g52 cutBottom cutLeft s+28", "g53 cutBottom cutLeft s+30", "g54 cutBottom cutLeft s+32", "g55 cutBottom cutLeft s+34",
        "g60 foldBottom e-36", "g61 foldBottom cutLeft e-38", "g62 foldBottom cutLeft e-40", "g63 foldBottom cutLeft e-42",
        "g64 foldBottom cutLeft e-44", "g65 foldBottom cutLeft e-46", "g70 s+36", "g71 cutLeft s+38",
        "g72 cutLeft s+40", "g73 cutLeft s+42", "g74 cutLeft s+44", "g75 cutLeft s+46",
      ],
      [
        "g00 r foldTop e-11", "g01 r foldTop cutRight e-9", "g02 r foldTop cutRight e-7", "g03 r foldTop cutRight e-5",
        "g04 r foldTop cutRight e-3", "g05 r foldTop cutRight e-1", "g10 r cutTop s+11", "g11 r cutTop cutRight s+9",
        "g12 r cutTop cutRight s+7", "g13 r cutTop cutRight s+5", "g14 r cutTop cutRight s+3", "g15 r cutTop cutRight s+1",
        "g20 r foldTop e-23", "g21 r foldTop cutRight e-21", "g22 r foldTop cutRight e-19", "g23 r foldTop cutRight e-17",
        "g24 r foldTop cutRight e-15", "g25 r foldTop cutRight e-13", "g30 r cutTop s+23", "g31 r cutTop cutRight s+21",
        "g32 r cutTop cutRight s+19", "g33 r cutTop cutRight s+17", "g34 r cutTop cutRight s+15", "g35 r cutTop cutRight s+13",
        "g40 r foldTop e-35", "g41 r foldTop cutRight e-33", "g42 r foldTop cutRight e-31", "g43 r foldTop cutRight e-29",
        "g44 r foldTop cutRight e-27", "g45 r foldTop cutRight e-25", "g50 r cutTop s+35", "g51 r cutTop cutRight s+33",
        "g52 r cutTop cutRight s+31", "g53 r cutTop cutRight s+29", "g54 r cutTop cutRight s+27", "g55 r cutTop cutRight s+25",
        "g60 r foldTop e-47", "g61 r foldTop cutRight e-45", "g62 r foldTop cutRight e-43", "g63 r foldTop cutRight e-41",
        "g64 r foldTop cutRight e-39", "g65 r foldTop cutRight e-37", "g70 r s+47", "g71 r cutRight s+45",
        "g72 r cutRight s+43", "g73 r cutRight s+41", "g74 r cutRight s+39", "g75 r cutRight s+37",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "64th/single/portrait/side": {
    grid: "sxfr-por", portraitPaper: true, pagesPerSheet: 64, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-31", "g01 r cutTop foldRight s+31", "g02 r cutTop foldRight s+30", "g03 r cutTop foldRight s+29",
        "g04 r cutTop foldRight s+28", "g05 r cutTop foldRight s+27", "g06 r cutTop foldRight s+26", "g07 r foldTop foldRight s+25",
        "g10 cutBottom e-30", "g11 cutBottom foldLeft e-29", "g12 cutBottom foldLeft e-28", "g13 foldBottom foldLeft e-27",
        "g14 foldBottom cutLeft s+21", "g15 cutBottom foldLeft s+22", "g16 cutBottom foldLeft s+23", "g17 cutBottom foldLeft s+24",
        "g20 r foldTop e-23", "g21 r cutTop foldRight e-24", "g22 r cutTop foldRight e-25", "g23 r cutTop foldRight e-26",
        "g24 r cutTop cutRight s+20", "g25 r cutTop foldRight s+19", "g26 r cutTop foldRight s+18", "g27 r foldTop foldRight s+17",
        "g30 cutBottom e-22", "g31 cutBottom foldLeft e-21", "g32 cutBottom foldLeft e-20", "g33 foldBottom foldLeft e-19",
        "g34 foldBottom cutLeft s+13", "g35 cutBottom foldLeft s+14", "g36 cutBottom foldLeft s+15", "g37 cutBottom foldLeft s+16",
        "g40 r foldTop e-15", "g41 r cutTop foldRight e-16", "g42 r cutTop foldRight e-17", "g43 r cutTop foldRight e-18",
        "g44 r cutTop cutRight s+12", "g45 r cutTop foldRight s+11", "g46 r cutTop foldRight s+10", "g47 r foldTop foldRight s+9",
        "g50 cutBottom e-14", "g51 cutBottom foldLeft e-13", "g52 cutBottom foldLeft e-12", "g53 foldBottom foldLeft e-11",
        "g54 foldBottom cutLeft s+5", "g55 cutBottom foldLeft s+6", "g56 cutBottom foldLeft s+7", "g57 cutBottom foldLeft s+8",
        "g60 r foldTop e-7", "g61 r cutTop foldRight e-8", "g62 r cutTop foldRight e-9", "g63 r cutTop foldRight e-10",
        "g64 r cutTop cutRight s+4", "g65 r cutTop foldRight s+3", "g66 r cutTop foldRight s+2", "g67 r foldTop foldRight s+1",
        "g70 e-6", "g71 foldLeft e-5", "g72 foldLeft e-4", "g73 foldLeft e-3",
        "g74 foldLeft e-2", "g75 foldLeft e-1", "g76 foldLeft e", "g77 foldLeft s",
      ],
    ],
  },
  "64th/single/portrait/top": {
    grid: "sxfr-por", portraitPaper: true, pagesPerSheet: 64, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-6", "g01 r foldTop foldRight e-7", "g02 foldBottom cutLeft e-14", "g03 r foldTop foldRight e-15",
        "g04 foldBottom cutLeft e-22", "g05 r foldTop foldRight e-23", "g06 foldBottom cutLeft e-30", "g07 r foldTop foldRight e-31",
        "g10 foldBottom e-5", "g11 r foldTop cutRight e-8", "g12 foldBottom cutLeft e-13", "g13 r foldTop cutRight e-16",
        "g14 foldBottom cutLeft e-21", "g15 r foldTop cutRight e-24", "g16 foldBottom cutLeft e-29", "g17 r foldTop cutRight s+31",
        "g20 foldBottom e-4", "g21 r foldTop cutRight e-9", "g22 foldBottom cutLeft e-12", "g23 r foldTop cutRight e-17",
        "g24 foldBottom cutLeft e-20", "g25 r foldTop cutRight e-25", "g26 foldBottom cutLeft e-28", "g27 r foldTop cutRight s+30",
        "g30 foldBottom e-3", "g31 r cutTop cutRight e-10", "g32 cutBottom foldLeft e-11", "g33 r cutTop cutRight e-18",
        "g34 cutBottom foldLeft e-19", "g35 r cutTop cutRight e-26", "g36 cutBottom foldLeft e-27", "g37 r foldTop cutRight s+29",
        "g40 foldBottom e-2", "g41 r foldTop cutRight s+4", "g42 foldBottom foldLeft s+5", "g43 r foldTop cutRight s+12",
        "g44 foldBottom foldLeft s+13", "g45 r foldTop cutRight s+20", "g46 foldBottom foldLeft s+21", "g47 r foldTop cutRight s+28",
        "g50 foldBottom e-1", "g51 r foldTop cutRight s+3", "g52 foldBottom cutLeft s+6", "g53 r foldTop cutRight s+11",
        "g54 foldBottom cutLeft s+14", "g55 r foldTop cutRight s+19", "g56 foldBottom cutLeft s+22", "g57 r foldTop cutRight s+27",
        "g60 foldBottom e", "g61 r foldTop cutRight s+2", "g62 foldBottom cutLeft s+7", "g63 r foldTop cutRight s+10",
        "g64 foldBottom cutLeft s+15", "g65 r foldTop cutRight s+18", "g66 foldBottom cutLeft s+23", "g67 r foldTop cutRight s+26",
        "g70 s", "g71 r foldRight s+1", "g72 cutLeft s+8", "g73 r foldRight s+9",
        "g74 cutLeft s+16", "g75 r foldRight s+17", "g76 cutLeft s+24", "g77 r foldRight s+25",
      ],
    ],
    backCover: [{ side: 0, cell: 48, spec: "g60 r foldTop e" }],
  },
  "64th/single/landscape/side": {
    grid: "sxfr-lnd", portraitPaper: false, pagesPerSheet: 64, sheetIdStep: 2,
    sides: [
      [
        "g00 r foldTop e-31", "g01 r cutTop foldRight s+31", "g02 r cutTop foldRight s+30", "g03 r cutTop foldRight s+29",
        "g04 r cutTop foldRight s+28", "g05 r cutTop foldRight s+27", "g06 r cutTop foldRight s+26", "g07 r foldTop foldRight s+25",
        "g10 cutBottom e-30", "g11 cutBottom foldLeft e-29", "g12 cutBottom foldLeft e-28", "g13 foldBottom foldLeft e-27",
        "g14 foldBottom cutLeft s+21", "g15 cutBottom foldLeft s+22", "g16 cutBottom foldLeft s+23", "g17 cutBottom foldLeft s+24",
        "g20 r foldTop e-23", "g21 r cutTop foldRight e-24", "g22 r cutTop foldRight e-25", "g23 r cutTop foldRight e-26",
        "g24 r cutTop cutRight s+20", "g25 r cutTop foldRight s+19", "g26 r cutTop foldRight s+18", "g27 r foldTop foldRight s+17",
        "g30 cutBottom e-22", "g31 cutBottom foldLeft e-21", "g32 cutBottom foldLeft e-20", "g33 foldBottom foldLeft e-19",
        "g34 foldBottom cutLeft s+13", "g35 cutBottom foldLeft s+14", "g36 cutBottom foldLeft s+15", "g37 cutBottom foldLeft s+16",
        "g40 r foldTop e-15", "g41 r cutTop foldRight e-16", "g42 r cutTop foldRight e-17", "g43 r cutTop foldRight e-18",
        "g44 r cutTop cutRight s+12", "g45 r cutTop foldRight s+11", "g46 r cutTop foldRight s+10", "g47 r foldTop foldRight s+9",
        "g50 cutBottom e-14", "g51 cutBottom foldLeft e-13", "g52 cutBottom foldLeft e-12", "g53 foldBottom foldLeft e-11",
        "g54 foldBottom cutLeft s+5", "g55 cutBottom foldLeft s+6", "g56 cutBottom foldLeft s+7", "g57 cutBottom foldLeft s+8",
        "g60 r foldTop e-7", "g61 r cutTop foldRight e-8", "g62 r cutTop foldRight e-9", "g63 r cutTop foldRight e-10",
        "g64 r cutTop cutRight s+4", "g65 r cutTop foldRight s+3", "g66 r cutTop foldRight s+2", "g67 r foldTop foldRight s+1",
        "g70 e-6", "g71 foldLeft e-5", "g72 foldLeft e-4", "g73 foldLeft e-3",
        "g74 foldLeft e-2", "g75 foldLeft e-1", "g76 foldLeft e", "g77 foldLeft s",
      ],
    ],
  },
  "64th/single/landscape/top": {
    grid: "sxfr-lnd", portraitPaper: false, pagesPerSheet: 64, sheetIdStep: 2,
    sides: [
      [
        "g00 foldBottom e-6", "g01 r foldTop foldRight e-7", "g02 foldBottom cutLeft e-14", "g03 r foldTop foldRight e-15",
        "g04 foldBottom cutLeft e-22", "g05 r foldTop foldRight e-23", "g06 foldBottom cutLeft e-30", "g07 r foldTop foldRight e-31",
        "g10 foldBottom e-5", "g11 r foldTop cutRight e-8", "g12 foldBottom cutLeft e-13", "g13 r foldTop cutRight e-16",
        "g14 foldBottom cutLeft e-21", "g15 r foldTop cutRight e-24", "g16 foldBottom cutLeft e-29", "g17 r foldTop cutRight s+31",
        "g20 foldBottom e-4", "g21 r foldTop cutRight e-9", "g22 foldBottom cutLeft e-12", "g23 r foldTop cutRight e-17",
        "g24 foldBottom cutLeft e-20", "g25 r foldTop cutRight e-25", "g26 foldBottom cutLeft e-28", "g27 r foldTop cutRight s+30",
        "g30 foldBottom e-3", "g31 r cutTop cutRight e-10", "g32 cutBottom foldLeft e-11", "g33 r cutTop cutRight e-18",
        "g34 cutBottom foldLeft e-19", "g35 r cutTop cutRight e-26", "g36 cutBottom foldLeft e-27", "g37 r foldTop cutRight s+29",
        "g40 foldBottom e-2", "g41 r foldTop cutRight s+4", "g42 foldBottom foldLeft s+5", "g43 r foldTop cutRight s+12",
        "g44 foldBottom foldLeft s+13", "g45 r foldTop cutRight s+20", "g46 foldBottom foldLeft s+21", "g47 r foldTop cutRight s+28",
        "g50 foldBottom e-1", "g51 r foldTop cutRight s+3", "g52 foldBottom cutLeft s+6", "g53 r foldTop cutRight s+11",
        "g54 foldBottom cutLeft s+14", "g55 r foldTop cutRight s+19", "g56 foldBottom cutLeft s+22", "g57 r foldTop cutRight s+27",
        "g60 foldBottom e", "g61 r foldTop cutRight s+2", "g62 foldBottom cutLeft s+7", "g63 r foldTop cutRight s+10",
        "g64 foldBottom cutLeft s+15", "g65 r foldTop cutRight s+18", "g66 foldBottom cutLeft s+23", "g67 r foldTop cutRight s+26",
        "g70 s", "g71 r foldRight s+1", "g72 cutLeft s+8", "g73 r foldRight s+9",
        "g74 cutLeft s+16", "g75 r foldRight s+17", "g76 cutLeft s+24", "g77 r foldRight s+25",
      ],
    ],
    backCover: [{ side: 0, cell: 48, spec: "g60 r foldTop e" }],
  },
  "64th/double/portrait/side": {
    grid: "sxfr-por", portraitPaper: true, pagesPerSheet: 128,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g06 cutBottom cutLeft e-6", "g07 cutBottom foldLeft s+6",
        "g10 cutBottom e-8", "g11 cutBottom foldLeft s+8", "g12 cutBottom cutLeft e-10", "g13 cutBottom foldLeft s+10",
        "g14 cutBottom cutLeft e-12", "g15 cutBottom foldLeft s+12", "g16 cutBottom cutLeft e-14", "g17 cutBottom foldLeft s+14",
        "g20 cutBottom e-16", "g21 cutBottom foldLeft s+16", "g22 cutBottom cutLeft e-18", "g23 cutBottom foldLeft s+18",
        "g24 cutBottom cutLeft e-20", "g25 cutBottom foldLeft s+20", "g26 cutBottom cutLeft e-22", "g27 cutBottom foldLeft s+22",
        "g30 cutBottom e-24", "g31 cutBottom foldLeft s+24", "g32 cutBottom cutLeft e-26", "g33 cutBottom foldLeft s+26",
        "g34 cutBottom cutLeft e-28", "g35 cutBottom foldLeft s+28", "g36 cutBottom cutLeft e-30", "g37 cutBottom foldLeft s+30",
        "g40 cutBottom e-32", "g41 cutBottom foldLeft s+32", "g42 cutBottom cutLeft e-34", "g43 cutBottom foldLeft s+34",
        "g44 cutBottom cutLeft e-36", "g45 cutBottom foldLeft s+36", "g46 cutBottom cutLeft e-38", "g47 cutBottom foldLeft s+38",
        "g50 cutBottom e-40", "g51 cutBottom foldLeft s+40", "g52 cutBottom cutLeft e-42", "g53 cutBottom foldLeft s+42",
        "g54 cutBottom cutLeft e-44", "g55 cutBottom foldLeft s+44", "g56 cutBottom cutLeft e-46", "g57 cutBottom foldLeft s+46",
        "g60 cutBottom e-48", "g61 cutBottom foldLeft s+48", "g62 cutBottom cutLeft e-50", "g63 cutBottom foldLeft s+50",
        "g64 cutBottom cutLeft e-52", "g65 cutBottom foldLeft s+52", "g66 cutBottom cutLeft e-54", "g67 cutBottom foldLeft s+54",
        "g70 e-56", "g71 foldLeft s+56", "g72 cutLeft e-58", "g73 foldLeft s+58",
        "g74 cutLeft e-60", "g75 foldLeft s+60", "g76 cutLeft e-62", "g77 foldLeft s+62",
      ],
      [
        "g00 cutBottom s+7", "g01 cutBottom foldLeft e-7", "g02 cutBottom cutLeft s+5", "g03 cutBottom foldLeft e-5",
        "g04 cutBottom cutLeft s+3", "g05 cutBottom foldLeft e-3", "g06 cutBottom cutLeft s+1", "g07 cutBottom foldLeft e-1",
        "g10 cutBottom s+15", "g11 cutBottom foldLeft e-15", "g12 cutBottom cutLeft s+13", "g13 cutBottom foldLeft e-13",
        "g14 cutBottom cutLeft s+11", "g15 cutBottom foldLeft e-11", "g16 cutBottom cutLeft s+9", "g17 cutBottom foldLeft e-9",
        "g20 cutBottom s+23", "g21 cutBottom foldLeft e-23", "g22 cutBottom cutLeft s+21", "g23 cutBottom foldLeft e-21",
        "g24 cutBottom cutLeft s+19", "g25 cutBottom foldLeft e-19", "g26 cutBottom cutLeft s+17", "g27 cutBottom foldLeft e-17",
        "g30 cutBottom s+31", "g31 cutBottom foldLeft e-31", "g32 cutBottom cutLeft s+29", "g33 cutBottom foldLeft e-29",
        "g34 cutBottom cutLeft s+27", "g35 cutBottom foldLeft e-27", "g36 cutBottom cutLeft s+25", "g37 cutBottom foldLeft e-25",
        "g40 cutBottom s+39", "g41 cutBottom foldLeft e-39", "g42 cutBottom cutLeft s+37", "g43 cutBottom foldLeft e-37",
        "g44 cutBottom cutLeft s+35", "g45 cutBottom foldLeft e-35", "g46 cutBottom cutLeft s+33", "g47 cutBottom foldLeft e-33",
        "g50 cutBottom s+47", "g51 cutBottom foldLeft e-47", "g52 cutBottom cutLeft s+45", "g53 cutBottom foldLeft e-45",
        "g54 cutBottom cutLeft s+43", "g55 cutBottom foldLeft e-43", "g56 cutBottom cutLeft s+41", "g57 cutBottom foldLeft e-41",
        "g60 cutBottom s+55", "g61 cutBottom foldLeft e-55", "g62 cutBottom cutLeft s+53", "g63 cutBottom foldLeft e-53",
        "g64 cutBottom cutLeft s+51", "g65 cutBottom foldLeft e-51", "g66 cutBottom cutLeft s+49", "g67 cutBottom foldLeft e-49",
        "g70 s+63", "g71 foldLeft e-63", "g72 cutLeft s+61", "g73 foldLeft e-61",
        "g74 cutLeft s+59", "g75 foldLeft e-59", "g76 cutLeft s+57", "g77 foldLeft e-57",
      ],
    ],
  },
  "64th/double/portrait/top": {
    grid: "sxfr-por", portraitPaper: true, pagesPerSheet: 128,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g06 foldBottom cutLeft e-12", "g07 foldBottom cutLeft e-14",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10", "g16 cutBottom cutLeft s+12", "g17 cutBottom cutLeft s+14",
        "g20 foldBottom e-16", "g21 foldBottom cutLeft e-18", "g22 foldBottom cutLeft e-20", "g23 foldBottom cutLeft e-22",
        "g24 foldBottom cutLeft e-24", "g25 foldBottom cutLeft e-26", "g26 foldBottom cutLeft e-28", "g27 foldBottom cutLeft e-30",
        "g30 cutBottom s+16", "g31 cutBottom cutLeft s+18", "g32 cutBottom cutLeft s+20", "g33 cutBottom cutLeft s+22",
        "g34 cutBottom cutLeft s+24", "g35 cutBottom cutLeft s+26", "g36 cutBottom cutLeft s+28", "g37 cutBottom cutLeft s+30",
        "g40 foldBottom e-32", "g41 foldBottom cutLeft e-34", "g42 foldBottom cutLeft e-36", "g43 foldBottom cutLeft e-38",
        "g44 foldBottom cutLeft e-40", "g45 foldBottom cutLeft e-42", "g46 foldBottom cutLeft e-44", "g47 foldBottom cutLeft e-46",
        "g50 cutBottom s+32", "g51 cutBottom cutLeft s+34", "g52 cutBottom cutLeft s+36", "g53 cutBottom cutLeft s+38",
        "g54 cutBottom cutLeft s+40", "g55 cutBottom cutLeft s+42", "g56 cutBottom cutLeft s+44", "g57 cutBottom cutLeft s+46",
        "g60 foldBottom e-48", "g61 foldBottom cutLeft e-50", "g62 foldBottom cutLeft e-52", "g63 foldBottom cutLeft e-54",
        "g64 foldBottom cutLeft e-56", "g65 foldBottom cutLeft e-58", "g66 foldBottom cutLeft e-60", "g67 foldBottom cutLeft e-62",
        "g70 s+48", "g71 cutLeft s+50", "g72 cutLeft s+52", "g73 cutLeft s+54",
        "g74 cutLeft s+56", "g75 cutLeft s+58", "g76 cutLeft s+60", "g77 cutLeft s+62",
      ],
      [
        "g00 r foldTop e-15", "g01 r foldTop cutRight e-13", "g02 r foldTop cutRight e-11", "g03 r foldTop cutRight e-9",
        "g04 r foldTop cutRight e-7", "g05 r foldTop cutRight e-5", "g06 r foldTop cutRight e-3", "g07 r foldTop cutRight e-1",
        "g10 r cutTop s+15", "g11 r cutTop cutRight s+13", "g12 r cutTop cutRight s+11", "g13 r cutTop cutRight s+9",
        "g14 r cutTop cutRight s+7", "g15 r cutTop cutRight s+5", "g16 r cutTop cutRight s+3", "g17 r cutTop cutRight s+1",
        "g20 r foldTop e-31", "g21 r foldTop cutRight e-29", "g22 r foldTop cutRight e-27", "g23 r foldTop cutRight e-25",
        "g24 r foldTop cutRight e-23", "g25 r foldTop cutRight e-21", "g26 r foldTop cutRight e-19", "g27 r foldTop cutRight e-17",
        "g30 r cutTop s+31", "g31 r cutTop cutRight s+29", "g32 r cutTop cutRight s+27", "g33 r cutTop cutRight s+25",
        "g34 r cutTop cutRight s+23", "g35 r cutTop cutRight s+21", "g36 r cutTop cutRight s+19", "g37 r cutTop cutRight s+17",
        "g40 r foldTop e-47", "g41 r foldTop cutRight e-45", "g42 r foldTop cutRight e-43", "g43 r foldTop cutRight e-41",
        "g44 r foldTop cutRight e-39", "g45 r foldTop cutRight e-37", "g46 r foldTop cutRight e-35", "g47 r foldTop cutRight e-33",
        "g50 r cutTop s+47", "g51 r cutTop cutRight s+45", "g52 r cutTop cutRight s+43", "g53 r cutTop cutRight s+41",
        "g54 r cutTop cutRight s+39", "g55 r cutTop cutRight s+37", "g56 r cutTop cutRight s+35", "g57 r cutTop cutRight s+33",
        "g60 r foldTop e-63", "g61 r foldTop cutRight e-61", "g62 r foldTop cutRight e-59", "g63 r foldTop cutRight e-57",
        "g64 r foldTop cutRight e-55", "g65 r foldTop cutRight e-53", "g66 r foldTop cutRight e-51", "g67 r foldTop cutRight e-49",
        "g70 r s+63", "g71 r cutRight s+61", "g72 r cutRight s+59", "g73 r cutRight s+57",
        "g74 r cutRight s+55", "g75 r cutRight s+53", "g76 r cutRight s+51", "g77 r cutRight s+49",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
  "64th/double/landscape/side": {
    grid: "sxfr-lnd", portraitPaper: false, pagesPerSheet: 128,
    sides: [
      [
        "g00 cutBottom e", "g01 cutBottom foldLeft s", "g02 cutBottom cutLeft e-2", "g03 cutBottom foldLeft s+2",
        "g04 cutBottom cutLeft e-4", "g05 cutBottom foldLeft s+4", "g06 cutBottom cutLeft e-6", "g07 cutBottom foldLeft s+6",
        "g10 cutBottom e-8", "g11 cutBottom foldLeft s+8", "g12 cutBottom cutLeft e-10", "g13 cutBottom foldLeft s+10",
        "g14 cutBottom cutLeft e-12", "g15 cutBottom foldLeft s+12", "g16 cutBottom cutLeft e-14", "g17 cutBottom foldLeft s+14",
        "g20 cutBottom e-16", "g21 cutBottom foldLeft s+16", "g22 cutBottom cutLeft e-18", "g23 cutBottom foldLeft s+18",
        "g24 cutBottom cutLeft e-20", "g25 cutBottom foldLeft s+20", "g26 cutBottom cutLeft e-22", "g27 cutBottom foldLeft s+22",
        "g30 cutBottom e-24", "g31 cutBottom foldLeft s+24", "g32 cutBottom cutLeft e-26", "g33 cutBottom foldLeft s+26",
        "g34 cutBottom cutLeft e-28", "g35 cutBottom foldLeft s+28", "g36 cutBottom cutLeft e-30", "g37 cutBottom foldLeft s+30",
        "g40 cutBottom e-32", "g41 cutBottom foldLeft s+32", "g42 cutBottom cutLeft e-34", "g43 cutBottom foldLeft s+34",
        "g44 cutBottom cutLeft e-36", "g45 cutBottom foldLeft s+36", "g46 cutBottom cutLeft e-38", "g47 cutBottom foldLeft s+38",
        "g50 cutBottom e-40", "g51 cutBottom foldLeft s+40", "g52 cutBottom cutLeft e-42", "g53 cutBottom foldLeft s+42",
        "g54 cutBottom cutLeft e-44", "g55 cutBottom foldLeft s+44", "g56 cutBottom cutLeft e-46", "g57 cutBottom foldLeft s+46",
        "g60 cutBottom e-48", "g61 cutBottom foldLeft s+48", "g62 cutBottom cutLeft e-50", "g63 cutBottom foldLeft s+50",
        "g64 cutBottom cutLeft e-52", "g65 cutBottom foldLeft s+52", "g66 cutBottom cutLeft e-54", "g67 cutBottom foldLeft s+54",
        "g70 e-56", "g71 foldLeft s+56", "g72 cutLeft e-58", "g73 foldLeft s+58",
        "g74 cutLeft e-60", "g75 foldLeft s+60", "g76 cutLeft e-62", "g77 foldLeft s+62",
      ],
      [
        "g00 cutBottom s+7", "g01 cutBottom foldLeft e-7", "g02 cutBottom cutLeft s+5", "g03 cutBottom foldLeft e-5",
        "g04 cutBottom cutLeft s+3", "g05 cutBottom foldLeft e-3", "g06 cutBottom cutLeft s+1", "g07 cutBottom foldLeft e-1",
        "g10 cutBottom s+15", "g11 cutBottom foldLeft e-15", "g12 cutBottom cutLeft s+13", "g13 cutBottom foldLeft e-13",
        "g14 cutBottom cutLeft s+11", "g15 cutBottom foldLeft e-11", "g16 cutBottom cutLeft s+9", "g17 cutBottom foldLeft e-9",
        "g20 cutBottom s+23", "g21 cutBottom foldLeft e-23", "g22 cutBottom cutLeft s+21", "g23 cutBottom foldLeft e-21",
        "g24 cutBottom cutLeft s+19", "g25 cutBottom foldLeft e-19", "g26 cutBottom cutLeft s+17", "g27 cutBottom foldLeft e-17",
        "g30 cutBottom s+31", "g31 cutBottom foldLeft e-31", "g32 cutBottom cutLeft s+29", "g33 cutBottom foldLeft e-29",
        "g34 cutBottom cutLeft s+27", "g35 cutBottom foldLeft e-27", "g36 cutBottom cutLeft s+25", "g37 cutBottom foldLeft e-25",
        "g40 cutBottom s+39", "g41 cutBottom foldLeft e-39", "g42 cutBottom cutLeft s+37", "g43 cutBottom foldLeft e-37",
        "g44 cutBottom cutLeft s+35", "g45 cutBottom foldLeft e-35", "g46 cutBottom cutLeft s+33", "g47 cutBottom foldLeft e-33",
        "g50 cutBottom s+47", "g51 cutBottom foldLeft e-47", "g52 cutBottom cutLeft s+45", "g53 cutBottom foldLeft e-45",
        "g54 cutBottom cutLeft s+43", "g55 cutBottom foldLeft e-43", "g56 cutBottom cutLeft s+41", "g57 cutBottom foldLeft e-41",
        "g60 cutBottom s+55", "g61 cutBottom foldLeft e-55", "g62 cutBottom cutLeft s+53", "g63 cutBottom foldLeft e-53",
        "g64 cutBottom cutLeft s+51", "g65 cutBottom foldLeft e-51", "g66 cutBottom cutLeft s+49", "g67 cutBottom foldLeft e-49",
        "g70 s+63", "g71 foldLeft e-63", "g72 cutLeft s+61", "g73 foldLeft e-61",
        "g74 cutLeft s+59", "g75 foldLeft e-59", "g76 cutLeft s+57", "g77 foldLeft e-57",
      ],
    ],
  },
  "64th/double/landscape/top": {
    grid: "sxfr-lnd", portraitPaper: false, pagesPerSheet: 128,
    sides: [
      [
        "g00 foldBottom e", "g01 foldBottom cutLeft e-2", "g02 foldBottom cutLeft e-4", "g03 foldBottom cutLeft e-6",
        "g04 foldBottom cutLeft e-8", "g05 foldBottom cutLeft e-10", "g06 foldBottom cutLeft e-12", "g07 foldBottom cutLeft e-14",
        "g10 cutBottom s", "g11 cutBottom cutLeft s+2", "g12 cutBottom cutLeft s+4", "g13 cutBottom cutLeft s+6",
        "g14 cutBottom cutLeft s+8", "g15 cutBottom cutLeft s+10", "g16 cutBottom cutLeft s+12", "g17 cutBottom cutLeft s+14",
        "g20 foldBottom e-16", "g21 foldBottom cutLeft e-18", "g22 foldBottom cutLeft e-20", "g23 foldBottom cutLeft e-22",
        "g24 foldBottom cutLeft e-24", "g25 foldBottom cutLeft e-26", "g26 foldBottom cutLeft e-28", "g27 foldBottom cutLeft e-30",
        "g30 cutBottom s+16", "g31 cutBottom cutLeft s+18", "g32 cutBottom cutLeft s+20", "g33 cutBottom cutLeft s+22",
        "g34 cutBottom cutLeft s+24", "g35 cutBottom cutLeft s+26", "g36 cutBottom cutLeft s+28", "g37 cutBottom cutLeft s+30",
        "g40 foldBottom e-32", "g41 foldBottom cutLeft e-34", "g42 foldBottom cutLeft e-36", "g43 foldBottom cutLeft e-38",
        "g44 foldBottom cutLeft e-40", "g45 foldBottom cutLeft e-42", "g46 foldBottom cutLeft e-44", "g47 foldBottom cutLeft e-46",
        "g50 cutBottom s+32", "g51 cutBottom cutLeft s+34", "g52 cutBottom cutLeft s+36", "g53 cutBottom cutLeft s+38",
        "g54 cutBottom cutLeft s+40", "g55 cutBottom cutLeft s+42", "g56 cutBottom cutLeft s+44", "g57 cutBottom cutLeft s+46",
        "g60 foldBottom e-48", "g61 foldBottom cutLeft e-50", "g62 foldBottom cutLeft e-52", "g63 foldBottom cutLeft e-54",
        "g64 foldBottom cutLeft e-56", "g65 foldBottom cutLeft e-58", "g66 foldBottom cutLeft e-60", "g67 foldBottom cutLeft e-62",
        "g70 s+48", "g71 cutLeft s+50", "g72 cutLeft s+52", "g73 cutLeft s+54",
        "g74 cutLeft s+56", "g75 cutLeft s+58", "g76 cutLeft s+60", "g77 cutLeft s+62",
      ],
      [
        "g00 r foldTop e-15", "g01 r foldTop cutRight e-13", "g02 r foldTop cutRight e-11", "g03 r foldTop cutRight e-9",
        "g04 r foldTop cutRight e-7", "g05 r foldTop cutRight e-5", "g06 r foldTop cutRight e-3", "g07 r foldTop cutRight e-1",
        "g10 r cutTop s+15", "g11 r cutTop cutRight s+13", "g12 r cutTop cutRight s+11", "g13 r cutTop cutRight s+9",
        "g14 r cutTop cutRight s+7", "g15 r cutTop cutRight s+5", "g16 r cutTop cutRight s+3", "g17 r cutTop cutRight s+1",
        "g20 r foldTop e-31", "g21 r foldTop cutRight e-29", "g22 r foldTop cutRight e-27", "g23 r foldTop cutRight e-25",
        "g24 r foldTop cutRight e-23", "g25 r foldTop cutRight e-21", "g26 r foldTop cutRight e-19", "g27 r foldTop cutRight e-17",
        "g30 r cutTop s+31", "g31 r cutTop cutRight s+29", "g32 r cutTop cutRight s+27", "g33 r cutTop cutRight s+25",
        "g34 r cutTop cutRight s+23", "g35 r cutTop cutRight s+21", "g36 r cutTop cutRight s+19", "g37 r cutTop cutRight s+17",
        "g40 r foldTop e-47", "g41 r foldTop cutRight e-45", "g42 r foldTop cutRight e-43", "g43 r foldTop cutRight e-41",
        "g44 r foldTop cutRight e-39", "g45 r foldTop cutRight e-37", "g46 r foldTop cutRight e-35", "g47 r foldTop cutRight e-33",
        "g50 r cutTop s+47", "g51 r cutTop cutRight s+45", "g52 r cutTop cutRight s+43", "g53 r cutTop cutRight s+41",
        "g54 r cutTop cutRight s+39", "g55 r cutTop cutRight s+37", "g56 r cutTop cutRight s+35", "g57 r cutTop cutRight s+33",
        "g60 r foldTop e-63", "g61 r foldTop cutRight e-61", "g62 r foldTop cutRight e-59", "g63 r foldTop cutRight e-57",
        "g64 r foldTop cutRight e-55", "g65 r foldTop cutRight e-53", "g66 r foldTop cutRight e-51", "g67 r foldTop cutRight e-49",
        "g70 r s+63", "g71 r cutRight s+61", "g72 r cutRight s+59", "g73 r cutRight s+57",
        "g74 r cutRight s+55", "g75 r cutRight s+53", "g76 r cutRight s+51", "g77 r cutRight s+49",
      ],
    ],
    backCover: [{ side: 0, cell: 0, spec: "g00 r foldTop e" }],
  },
};

// Layouts identical to another one.
LAYOUTS["half/single/portrait/top"] = LAYOUTS["half/single/portrait/side"];
LAYOUTS["half/single/landscape/top"] = LAYOUTS["half/single/landscape/side"];
LAYOUTS["half/double/portrait/side"] = LAYOUTS["half/single/portrait/side"];
LAYOUTS["half/double/portrait/top"] = LAYOUTS["half/single/portrait/side"];
LAYOUTS["half/double/landscape/side"] = LAYOUTS["half/single/landscape/side"];
LAYOUTS["half/double/landscape/top"] = LAYOUTS["half/single/landscape/side"];

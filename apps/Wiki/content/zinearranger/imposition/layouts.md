## Intro

A **layout** is a recipe for one kind of zine, for example "eighth size, printed on one side, portrait, spine on the side". It says: this sheet is a grid; the cell at the top left shows *this* page, upside down, with a fold line on its top edge; and so on. All of ZineArranger's layouts are kept as **data**, in one big table, instead of as program logic.

## How to use

You never edit layouts; you choose them with the options (size, one or both sides, orientation, spine side, two copies per sheet). The app turns your choices into a **key** that picks one table entry. There are **84 keys** (some are aliases for another entry).

## How it works

### Data instead of code

Earlier versions of the program decided each cell's page with long chains of `if` tests. Putting it into a table has three advantages: it is easier to **read** and **check**, it is the same shape for every size, and a new size is a few lines of data. It was checked against the original code for every option combination.

### The key

`<size>/<single|double>/<portrait|landscape>/<side|top>`, plus `/copy` for quarter-size, double-sided, two copies per sheet. For example `eighth/single/portrait/side`.

### An entry

| Field | Meaning |
|---|---|
| `grid` | the name of the CSS grid for the sheet (`eig-por`: 4 across and 2 down) |
| `portraitPaper` | whether the printed sheet is portrait (decides the print orientation) |
| `pagesPerSheet` | zine pages on one sheet, both sides |
| `step` | how far each next sheet moves inward in a signature (default: half of `pagesPerSheet`) |
| `sides` | one list per printed side; each cell is a short text spec |
| `backCover` | cells that use a different spec when "Flip Back Cover" is off |

### A cell spec

`"tl r foldTop e-3"` is read **left to right**:
- `tl`: its **position** in the grid (top left; also `tml`, `tmr`, `tr`, `bl`, `bml`, `bmr`, `br`, `g00`… for larger grids);
- `r`: printed **rotated** (upside down, 180°), so it reads the right way up after folding;
- `foldTop`, `cutRight`…: a **fold** or **cut** line on that edge, drawn if you tick the guide options;
- the **last word** is the page: `s` is the sheet's first page, `e` its last; `s+3` is three after the first; `e-3` is three before the last; `m` and `n` are `s` and `e` moved a quarter signature inward (for nested quarter-size sheets); a trailing `b` is the second copy.

### Pages are slots, counted from 0

`s` and `e` are slot numbers (0 for the first page). The last word is turned into a real slot number later ([Arranging sheets](zinearranger/imposition/arrange-sheets)).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The table's documentation

```js file=apps/ZineArranger/src/imposition/layouts.js
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
```

### One entry: the minizine

```js file=apps/ZineArranger/src/imposition/layouts.js
  "eighth/single/portrait/side": {
    grid: "eig-por", portraitPaper: false, pagesPerSheet: 8,
    sides: [
      [
        "tl r foldTop e-3", "tml r foldRight cutTop s+3", "tmr r foldRight cutTop s+2", "tr r foldRight foldTop s+1",
        "bl e-2", "bml foldLeft e-1", "bmr foldLeft e", "br foldLeft s",
      ],
    ],
  },
```

**The Logic:** one side (`sides` has a single list), eight cells in reading order of the grid: the top row `tl tml tmr tr` is **rotated** (`r`) and the bottom row is upright. Reading the pages as `s` (the first) and `e` (the last): the bottom-right cell holds `s`, bottom-middle-right holds `e`, bottom-middle-left `e-1`, bottom-left `e-2`; the top row, right to left, holds `s+1`, `s+2`, `s+3`, and `e-3` at the far left. So one sheet holds 8 consecutive pages in the famous "one-sheet minizine" pattern, and pages are arranged so a single cut (marked by `cutTop` in the top-middle cells) and folds produce the booklet.

**Worked example.** For a sheet whose first page `s` is slot 0 and last `e` is slot 7 (an 8-page zine), the cells hold slots:

| | left | middle-left | middle-right | right |
|---|---|---|---|---|
| top row (rotated) | `e-3` = **4** | `s+3` = **3** | `s+2` = **2** | `s+1` = **1** |
| bottom row | `e-2` = **5** | `e-1` = **6** | `e` = **7** | `s` = **0** |

(This was checked by running the real code: the top row prints `4, 3, 2, 1` and the bottom row `5, 6, 7, 0`.) In reader terms: the zine's first page (slot 0) is bottom right and its last page (slot 7) is next to it, so the cover and back cover share a quarter of the sheet.

### One entry with two sides: quarter size, double-sided

```js file=apps/ZineArranger/src/imposition/layouts.js
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
```

**The Logic:** two lists in `sides`: the front and the back of the same sheet. `pagesPerSheet: 8` and `step: 2` (not the default 4): each sheet moves inward by 2 pages per sheet in the signature, because a quarter-sized sheet is folded twice. `m` and `n` are used here: the bottom cells show pages a quarter-signature in from the ends, which is how the two nested halves are arranged.

**Worked example (checked by running the code).** A double-sided quarter-size zine of 12 pages (padded to 16): sheet sides in order give, for the top-left, top-right, bottom-left, bottom-right cells: **15, 0, 11, 4** (front 1), **1, 14, 5, 10** (back 1), **13, 2, 9, 6**, **3, 12, 7, 8**.

### Aliases

```js file=apps/ZineArranger/src/imposition/layouts.js
// Layouts identical to another one.
LAYOUTS["half/single/portrait/top"] = LAYOUTS["half/single/portrait/side"];
LAYOUTS["half/single/landscape/top"] = LAYOUTS["half/single/landscape/side"];
LAYOUTS["half/double/portrait/side"] = LAYOUTS["half/single/portrait/side"];
```

**The Logic:** a layout identical to another one is **not copied**, just pointed at it: `LAYOUTS["half/double/portrait/side"] = LAYOUTS["half/single/portrait/side"]`. Half size has the same pattern on both sides of the paper, whether you tick one side or both.

### The grid in CSS

```css file=apps/ZineArranger/style.css
.zine-sheet {
    width: var(--sheet-width);
    height: var(--sheet-height);
    display: grid;
    grid-template-areas:
    "tl tr"
    "bl br";
}
```

```css file=apps/ZineArranger/style.css
.eig-por {
    grid-template-areas:
    "tl tml tmr tr"
    "bl bml bmr br";
}
```

**The Logic:** a **CSS grid** divides a box into named areas. `.eig-por` says: two rows, with the names `tl tml tmr tr` on the first and `bl bml bmr br` on the second. Each cell has a class (`.tl { grid-area: tl; }`) that puts it in its named area. So the cell *names* in the layout table are literally the names of grid areas, which is why adding a size needs only a new grid and a new table entry.

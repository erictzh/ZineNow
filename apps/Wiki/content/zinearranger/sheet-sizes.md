## Intro

The preview and the printout must agree on **how big the paper is** and **how the pages divide it**. This page explains the **zine sizes** (half, quarter, eighth… 64th), the **paper size**, and how the program works out the grid of cells on a sheet.

## How to use

- **Zine Size** (Basic tab): *Half*, *Quarter*, *Eighth (Minizine)*; **More Sizes** adds 1/12th, 1/16th (Micro-Mini), 1/24th, 1/32nd, 1/36th, 1/48th and 1/64th.
- **Paper size:** the **Width** and **Height** boxes in the Advanced tab, in **Inches** or **Millimeters**, with presets: **US Letter**, **11" × 17"**, **A4** and **A3**.
- Choosing a size sets sensible defaults (for instance Quarter switches to double-sided; Eighth to single-sided). You can change them after.
- **Orientation:** Portrait or Landscape zine. **Spine:** Side or Top.
- The label under the page-count setting tells you the page count to aim for: *"the page count should be a multiple of 8."*

## How it works

### The grid

A sheet is divided into a grid of cells, one per zine page. Each size has its own grid for a portrait zine:

| Size | Pages across × down (one side) |
|---|---|
| Half | 2 × 1 |
| Quarter | 2 × 2 |
| Eighth | 4 × 2 |
| 1/12th | 6 × 2 |
| 1/16th | 4 × 4 |
| 1/24th | 6 × 4 |
| 1/32nd | 8 × 4 |
| 1/36th | 6 × 6 |
| 1/48th | 8 × 6 |
| 1/64th | 8 × 8 |

The number of **zine pages per sheet** (`pgmult`) is cells × 2 if the sheet is printed on both sides.

### Orientation puzzle

For a landscape zine the grid is **turned**: rows and columns swap. A square grid (2 × 2, 4 × 4, 6 × 6, 8 × 8) keeps the zine's own orientation, while any other grid turns the paper a quarter turn: the paper's orientation is the opposite of the zine's.

### Paper to screen pixels

The preview works in screen pixels, while printing works in real units. The code makes the preview **at least 1000 px wide** by multiplying the paper's width (in whatever unit) by 2 until it passes 1000. That multiplier becomes a **scale**; the sheet is `scale × width` by `scale × height`. The numbers are written into **CSS variables** that the stylesheet reads: `--sheet-width`, `--page-width` (screen size) and `--sheet-print-width` (real size with its unit, such as `297mm`, used in print).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The grid table and `sheetGrid`

```js file=apps/ZineArranger/src/sheetGrid.js
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
```

```js file=apps/ZineArranger/src/sheetGrid.js fn=sheetGrid
```

**The Logic:** `const { cols, rows } = GRIDS[size]` looks up the grid and **unpacks** its two numbers into names. The result has four values:
- `pgmult`: pages per sheet. Double-sided doubles it. Two special cases: half size is always 4 (one sheet folded once, printed on both sides) and quarter size printed double-sided in **two copies mode** has 4 (the same four pages twice on one sheet).
- `turnGrid` is true when the grid is not square *and* the zine is landscape. Then `divHoriz` (pages across) is `rows` and `divVert` is `cols`.
- `pagePortrait`: for a square grid it matches the zine; otherwise the opposite.

**Worked example.**
| Call | Result |
|---|---|
| eighth, one-sided, portrait zine | `{ pgmult: 8, divHoriz: 4, divVert: 2, pagePortrait: false }` (a landscape sheet, 4 across) |
| eighth, one-sided, **landscape** zine | `{ pgmult: 8, divHoriz: 2, divVert: 4, pagePortrait: true }` (turned: 2 across, 4 down, a portrait sheet) |
| quarter, double-sided, **two copies** | `{ pgmult: 4, divHoriz: 2, divVert: 2, pagePortrait: true }` |
| half, one-sided | `{ pgmult: 4, divHoriz: 2, divVert: 1, pagePortrait: false }` |
| 1/16th, double-sided, landscape | `{ pgmult: 32, divHoriz: 4, divVert: 4, pagePortrait: false }` (square: keeps the zine's orientation, landscape means a landscape sheet) |

### `applySheetSizes`

```js file=apps/ZineArranger/src/sheetSizes.js fn=applySheetSizes
```

**The Logic:**
- The Width and Height boxes are labelled for a **portrait** sheet. If the sheet is landscape (`!pagePortrait`), the labels swap and the two values are read the other way round, so the **long side is always the width** on screen.
- `state.pagerat = (aspectWidth / divHoriz) / (aspectHeight / divVert)`: the shape (width ÷ height) of **one cell**: the sheet's width split into `divHoriz` columns, over its height split into `divVert` rows.
- The scale loop: start with `scl` equal to the width and **keep doubling** while it is under 1000 (`scl *= 2`). Dividing by the original width gives the multiplier (always a power of 2); `Math.floor(scl, 1)` rounds it down (the second argument is ignored by `Math.floor`). Then `sheetWidth = scl × width`.
- `pgunit` becomes `"mm"` if the millimetre button is ticked, else `"in"`.
- Cell size: `pageWidth = floor(sheetWidth / divHoriz)`, `pageHeight = floor(sheetHeight / divVert)`.
- `rt.style.setProperty('--sheet-width', …)` writes **CSS variables** onto the page's root (`:root`), where the stylesheet uses them. `applyPreviewScale()` then fits the preview ([Preview zoom and panel resize](zinearranger/zoom-resize)).

**Worked example (A4, eighth size, portrait zine).** The sheet is landscape. `aspectWidth = 297`, `aspectHeight = 210` (mm). Doubling: 297 → 594 → 1188 (two doublings, now over 1000), so the multiplier is 1188 ÷ 297 = **4**. `sheetWidth = 1188`, `sheetHeight = 840`, `pageWidth = floor(1188/4) = 297`, `pageHeight = floor(840/2) = 420`, and `pagerat = (297/4) / (210/2) = 74.25 / 105 =` **0.7071**. The print variables are `--sheet-print-width: 297mm; --sheet-print-height: 210mm`.

**Worked example (US Letter).** `aspectWidth = 11`, `aspectHeight = 8.5` (inches). Doubling from 11: 22, 44, 88, 176, 352, 704, 1408 (seven doublings), multiplier 128. `sheetWidth = 1408`, `sheetHeight = 1088`, cells `352 × 544`, `pagerat = 2.75 / 4.25 = 0.647`.

### `updateSheetLabels` and the paper presets

```js file=apps/ZineArranger/src/sheetSizes.js fn=updateSheetLabels
```

```js file=apps/ZineArranger/src/optionsPanel.js fn=setPageUSLetter,setPageA4
```

**The Logic:** `updateSheetLabels` writes a sentence into the page using `innerHTML` (setting a piece of the page's HTML): the page count should be a multiple of `pgmult`, and the signature label shows `pgmult × sigSize` pages. The presets tick the unit button, put the numbers in the two boxes, and call `refreshSpecs()` to redo everything ([Options panel and display settings](zinearranger/options-display)).

**Worked example.** At 8 pages per sheet with 3 sheets per signature, the label reads *Sheets per signature (24 zine pages/signature)*.

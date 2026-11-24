## Intro

**Reverse Impose** does the opposite of the rest of ZineArranger. You give it a PDF that is **already imposed**, a print-ready booklet where the pages are in printing order, two to a sheet side, and it puts the pages back into **reading order**, one per page. Use it to recover a normal PDF from a booklet file, or to read a booklet on a screen.

## How to use

1. In the settings panel, switch on **Reverse Impose**. Everything about *making* a zine (size, pages, blanks, advanced tab) is hidden.
2. Load the booklet PDF: its pages must be **front, back, front, back…**, one pair per sheet. An odd page count gives a message: *Reverse Impose needs one front + one back page per sheet (an even page count).*
3. The preview shows the pages in order, labelled *Page 1 / 8*, each at its real size. Print or save as PDF.
4. Switch the toggle off to go back to normal zine making.

This is for simple **saddle-stitch** booklets: two pages side by side on each side of the sheet.

## How it works

### Splitting

Each sheet side is rendered, then cut straight down the **middle** into a left half and a right half. Each half is a zine page.

### Putting the halves in order

For a saddle-stitched booklet of *N* pages (*N* = 4 × the number of sheets), sheet *k* (counting from 1) holds:

| Side | Left half becomes page | Right half becomes page |
|---|---|---|
| Front | `N − 2(k − 1)` | `2k − 1` |
| Back | `2k` | `N − (2k − 1)` |

The first sheet carries the outermost pages (the cover and the back cover) and the last sheet the innermost (the middle of the booklet).

### Printing at the true size

Each reconstructed page is printed at its **real physical size**, taken from the source (half of the sheet's width). The program writes a special `@page` size so the printer uses a page of exactly that size, instead of leaving the content in the corner of an A4 sheet.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `reverseImposePdf`

```js file=apps/ZineArranger/src/reverseImpose.js fn=reverseImposePdf
```

**The Logic:** `actualPageCount % 2 !== 0` asks if the count is odd (`!==` means "not equal"). An odd or tiny count gives an error message, shown in the log (the `true` marks it as a warning) and in an `alert`. `totalSheets = pages / 2` and `N = totalSheets × 4`. `resultPages` is a list with a spare slot 0 so page numbers can be used directly as positions (`new Array(N + 1)`). For each sheet: the source pages `2k − 1` (front) and `2k` (back) are fetched and split in halves; then the four formulas decide where each half goes.

**Worked example.** 4 source pages = 2 sheets, so `N = 8`.
| Sheet *k* | Front left | Front right | Back left | Back right |
|---|---|---|---|---|
| 1 | `8 − 0 = 8` | `2 − 1 = 1` | `2` | `8 − 1 = 7` |
| 2 | `8 − 2 = 6` | `4 − 1 = 3` | `4` | `8 − 3 = 5` |

So source page 1 (front of sheet 1) contributes pages 8 and 1 (the back cover next to the front cover), source page 2 contributes 2 and 7, page 3 gives 6 and 3, page 4 gives 4 and 5. Reading order 1 to 8 is now complete.

### `splitPdfPageIntoHalves`

```js file=apps/ZineArranger/src/reverseImpose.js fn=splitPdfPageIntoHalves
```

**The Logic:** the page is rendered onto a large canvas at scale 2 × output 3 (so pixels are plentiful). A new canvas is made for each half; `drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)` **copies a rectangle**: for the left half from x = 0 to half the width; for the right half from `halfWidthPx` over to the end (`fullCanvas.width − halfWidthPx`, which handles an odd width). The physical size is `viewport / renderScale` (to cancel the scale) in **points** (1/72 inch), with the width halved.

**Worked example.** An A4 landscape source page is 841.89 × 595.28 pt: each half is `420.95 × 595.28` pt = **5.846 × 8.268 in** (an A5 page).

### `renderReverseImposeGrid`

```js file=apps/ZineArranger/src/reverseImpose.js fn=renderReverseImposeGrid
```

**The Logic:** a box per page, in order; each gets its size from CSS variables (`--ri-print-width`, `--ri-print-height`) and its **aspect ratio** (`entry.widthPt + " / " + entry.heightPt`). The height is made **0.05 in smaller** than the true height: a small safety margin so that rounding the box sizes to whole pixels, over many stacked pages, can never push the content onto an extra blank page. The `@page` size itself stays exact. A grey label, `Page i / N`, is shown on screen only (`noprint`).

**Worked example.** For the A5 halves above: `--ri-print-width: 5.846in`, `--ri-print-height: 8.218in` (8.268 − 0.05), while the sheet size written for the printer is `5.846in 8.268in`.

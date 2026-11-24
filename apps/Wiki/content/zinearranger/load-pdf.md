## Intro

**ZineArranger** takes an ordinary multi-page PDF and rearranges its pages onto printer sheets so that, once printed, folded and cut, they read in order as a little zine. This page covers the first step: **loading the PDF**, choosing **which pages** to use, and drawing each page into its place.

## How to use

1. Click the file picker in the top bar and choose a PDF. (Or arrive from ZEditor or Markdown to PDF with **Send to ZineArranger**, which does this for you.)
2. The preview on the left fills with sheets showing your pages. The strip under it says the paper size, the number of sheets and pages.
3. Optional, in the settings panel:
   - **Select Pages:** a list like `1-3,7` to use only those pages. Ranges may be backwards (`7-5` is the same as `5-7`), duplicates are ignored, and any piece that makes no sense is skipped. Leave blank for every page.
   - **Insert Blank Pages:** page numbers after which to leave an empty zine page. List a number twice for two blanks (`4,4`).
4. If the page count does not fill the last sheet, blank pages are added at the end automatically (the log says how many).

## How it works

### The big picture

Loading is a chain: **read the file** with **pdf.js** (a library that opens PDFs in the browser), **count the pages**, **choose the pages**, **make room** (compute how many sheet slots there are and write empty canvases for them), then **draw each PDF page** onto its canvas. A **canvas** is a rectangle you can draw pictures on.

### Slots

A zine page is a **slot**, numbered from 0. Normally PDF page 1 goes to slot 0, page 2 to slot 1, and so on. Two things change that:
- A page range removes pages: pages not chosen get no slot.
- Manual blanks leave gaps: after PDF page *p* the slot counter jumps ahead one extra for each blank requested.

### Double-sided padding

A double-sided zine whose page count is a multiple of 4 but not of the sheet size needs blank pages. Rather than putting them all at the very end, they are placed **in the middle**. That way the blank half-sheets end up on the *last* sheets of the stack, where they can be thrown away after printing without wrecking the folding order.

### Fitting the picture in its cell

Each PDF page is scaled to fit inside its cell without stretching: if the page is *wider* than the cell's shape, it is scaled to the cell's width; otherwise to the cell's height. The canvas is made **3 times bigger** than its on-screen size, so the printout is sharp, then shrunk back with CSS.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `parsePageRange`

```js file=apps/ZineArranger/src/pageRange.js fn=parsePageRange
```

**The Logic:**
- `spec.split(",")` cuts the text at commas into **tokens**; `trim()` removes spaces around each.
- A token like `3-6` is cut at the dash with `split("-")`. If that gives exactly two non-empty parts, both are read as whole numbers with `parseInt(text, 10)` (the `10` means "decimal"). `isNaN` is true for "not a number", and the token is skipped. `Math.min`/`Math.max` put the two ends in order, then a `for` loop visits every number from `lo` to `hi`, keeping those between 1 and `maxPage`.
- Other tokens are single numbers, kept if valid.
- Pages are stored as **keys of an object** (`pages[5] = true`), which cannot hold duplicates. `Object.keys(...)` lists them as text, `.map(Number)` turns them back into numbers and `.sort((a, b) => a - b)` sorts numerically (without that, JavaScript would sort `10` before `2`, as text).
- Nothing valid, or an empty spec, gives `null`: "use every page".

**Worked example** (a 10-page PDF).
| Spec | Result |
|---|---|
| `1-3, 7` | 1, 2, 3, 7 |
| `7-5` | 5, 6, 7 |
| `0, 3, 3, 12-14, x` | 3 (0 is below 1; the second 3 is a duplicate; 12 to 14 is beyond the end; `x` is not a number) |
| `   ` | `null` (every page) |
| `9-20` | 9, 10 (the range is cut at the last page) |

### `selectFile`

```js file=apps/ZineArranger/src/loadPdf.js fn=selectFile
```

**The Logic:**
- Everything is inside `if(files.length > 0)`: a file was chosen. The first lines clear the old sheets, hide the empty-preview message, and show the sheets area (or the reverse-impose grid, [Reverse imposition](zinearranger/reverse-imposition)). The browser tab's title becomes `name-Printable.pdf`, a handy default file name when printing to PDF.
- `URL.createObjectURL(file)` makes a temporary address pointing at the chosen file, and `pdfjsLib.getDocument(url)` starts loading it. The `(async () => { … })()` wrapper is a function that runs at once and lets us `await` (wait for) results without freezing the page.
- **Choose pages:** `parsePageRange(...)`, or a list of every page number if it returned `null`.
- **Slots:** `blankCounts` counts how many blanks follow each page number. `pdfPageToSlot[pn] = slotCursor` records each page's slot, then `slotCursor += 1 + (blankCounts[pn] || 0)` moves forward one slot for the page plus one per blank. `contentPageCount` is the total, blanks included.
- **Mid-bump:** `needsMidBump` is true with no manual blanks, double-sided, a page count that is a multiple of 4, and not a multiple of the sheet size. After `arrangeZineSheets()` has padded the count, `blankPages` is how many were added; at the page halfway through, `midBumper` is set to that number, shifting every later page that many slots further on.
- **Draw:** for each chosen page: `getPage(i)`, a **viewport** (the page's size at a given scale), then the scale: compare the page's width ÷ height with the cell's shape `state.pagerat`. `outputScale = 3` makes the canvas triple resolution, then `canvas.style.width/height` set the on-screen size. The page is painted with `page.render(...)`, using a `transform` matrix `[3, 0, 0, 3, 0, 0]` (scale by 3).
- **Quarter copy mode:** a second canvas `p<slot>b` gets a second copy of the same page.
- The `logCmd` and `logResult` lines write each step in the activity log ([Activity log](zinearranger/activity-log)).

**Worked example (slots).** Pages chosen `1, 2, 3`, with blanks requested after page 2 twice (`2,2`): page 1 gets slot 0 (the cursor moves to 1); page 2 gets slot 1 (the cursor moves `1 + 1 + 2 = 4`); page 3 gets slot 4. `contentPageCount = 5`; for an eighth-size zine (8 per sheet) padding adds 3 more blanks, giving 8 slots.

**Worked example (mid-bump).** A double-sided quarter-size zine, 8 slots per sheet and 12 pages: `12 % 4 == 0` and `12 % 8 != 0`, so `needsMidBump` is true. The count is padded to 16, so `blankPages = 4`. The trigger is at `selIdx + 1 == (16 − 4)/2 + 1 = 7`: pages 1 to 6 keep slots 0 to 5 and pages 7 to 12 move to slots 10 to 15, leaving slots 6 to 9 blank in the middle.

**Worked example (scale).** An A5 page is 419.76 × 595.44 pt (ratio 0.705) and the cell on an A4 eighth-size sheet has `pagerat = (297/4) / (210/2) = 0.7071`. The page's ratio is **smaller** than the cell's, so it is the *height* that limits: `scale = 420 / 595.44 = 0.705`, width becomes about 296 px, and the canvas about `888 × 1260` pixels.

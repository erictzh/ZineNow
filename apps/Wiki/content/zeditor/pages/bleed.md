## Intro

**Bleed** is extra picture that runs past the edge where the page will be cut. Printers cut a little off target, so without bleed a thin white line can show along an edge that should be solid colour or a full picture. If you add a bleed (usually 3 mm), the page is made bigger by that amount on every side, a dotted line shows where it will be cut, and **Export PDF** can keep the bleed, add crop marks, or trim it away.

The default is **no bleed**, so documents that do not need it behave exactly as before. Bleed is for blank pages (not imported PDF pages).

## How to use

1. **New document:** type a number in **Bleed (mm)** (0 for none). The dialog tells you the size each page will be with its bleed.
2. **Existing page:** **Page → Bleed → Set…**, type the bleed, then **Apply to this page** or **Apply to all pages**. The page grows (or shrinks) on every side and everything on it moves with the trim, so nothing shifts relative to the cut line. It is one undo step.
3. Put background colours and pictures out to the page edge, past the dotted line. The **Full picture** and **Cover** layouts already fill the whole page, bleed included, and the other layouts keep their text margins measured from the dotted line.
4. **Export → Export PDF:** when any page has bleed, two tick boxes appear in the Export menu:
   - **Include bleed** (on): pages are exported whole and the PDF records both boxes (TrimBox and BleedBox) that print shops read. Off: each page is cut down to its trim size.
   - **Crop marks** (only with bleed): small corner lines outside the bleed that show where to cut.

PNG and JPG page exports are the whole page, bleed included. The ruler and guides are not changed by bleed.

## How it works

### The page stores the whole page

A blank page keeps `bleedMm`, and its `width` and `height` are the **whole** page, bleed included. So every part of the app that draws, thumbnails or exports a page keeps working with no change; only the places that care about the cut line look at the bleed. `withBleed` works out the new size and how far the items must move (the change in bleed, on every side).

### The dotted line

The editor draws the trim rectangle (the page minus the bleed on every side) as a dotted line over the page. It is a view aid only: it is never printed.

### Export

For each page with bleed the exporter works in the whole page's coordinates and then chooses the sheet. **Include bleed**: the sheet is the whole page, with the TrimBox and BleedBox set. **Crop marks**: the sheet is 18 pt bigger on each side, the page is moved into the middle, and eight short lines are drawn in the corners, starting just outside the bleed. **Off**: the sheet is only the trim size and the page is shifted so the bleed falls off its edges.

## Code

### The bleed helpers

```js file=apps/ZEditor/src/model/bleed.js fn=withBleed
```

```js file=apps/ZEditor/src/model/bleed.js fn=cropMarkLines
```

### Choosing the sheet in the export

```js file=apps/ZEditor/src/io/pdfExport.js
    const b = bleedPt(pages[pageIdx]);
    const trimW = pageWidthPts - 2 * b, trimH = pageHeightPts - 2 * b;
    const pad = b > 0 && keepBleed && options.cropMarks ? CROP_PAD : 0; // room round the page for the crop marks
    const outPage = outDoc.addPage(b > 0 && !keepBleed ? [trimW, trimH] : [pageWidthPts + 2 * pad, pageHeightPts + 2 * pad]);
```

**The Logic:** `bleedPt` is the bleed in points (0 for a page without one). The trim size is the page minus two bleeds. `pad` is the extra sheet round the page, only when bleed is kept and crop marks are on. The new sheet is the trim size when the bleed is being cut off, otherwise the whole page plus the pad on each side.

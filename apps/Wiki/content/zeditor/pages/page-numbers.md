## Intro

**Page Numbers** prints a number on each page of the zine, automatically: in the corner, centred, with a style you choose, and only on the pages you pick. It is one document-wide setting, drawn on top of everything on the page.

## How to use

*Page menu → Page Numbers* (switch), then **Customize…**:
- **Start numbering on page** and **Stop after page** (empty means the last): which pages carry a number. They count positions in the document.
- **First page shows number:** the number the first numbered page gets. Use 5, for instance, if your zine continues another.
- **Position:** the four corners, centres top or bottom, or **Bottom / Top, outer corner**.
- **Style:** `1`, `– 1 –` or `Page 1`.
- **Size** (4–48 pt), **Distance from edge** (inches) and **Color**.

The number shows live on the page, and is printed by Export PDF, the image exports and Send to ZineArranger.

## How it works

### One function decides everything

`pageNumberSpec(settings, pageIdx, pageCount)` returns what to print on a page, or `null` for no number. The same function is used by the live preview, the PDF export and the image export, so they cannot disagree.

Its steps, for a page at position `p` (1-based):
1. Off, or `p` outside `from … last` (where `to = 0` means "the last page"): nothing.
2. The number is `first + (p − from)`: counting starts at the first *numbered* page.
3. The text comes from the style.
4. The position is resolved (see below), and split into a vertical part (`top` or `bottom`) and a horizontal one (`left`, `center`, `right`).

### "Outer corner" and the booklet rule

In a printed booklet, odd pages are on the right-hand side of a spread and even pages on the left. Numbers look best at the *outer* edges, away from the fold. So `bottom-outside` is rewritten as `bottom-right` for odd pages and `bottom-left` for even ones: `position % 2 === 1 ? "right" : "left"`.

### Placing it

On screen, the number is a text element at `marginIn × 72 × MAIN_SCALE` from the edges (inches to points to editor pixels), with the font size scaled the same way. Centre positions stretch the element over the full width and centre its text.

### Drawn last

On export the number is painted last, after the page, filter and items, so it is never hidden by a picture.

## Code

The default settings:

```js file=apps/ZEditor/src/model/pageNumbers.js
export const DEFAULT_PAGE_NUMBERS = { on: false, from: 1, to: 0, first: 1, position: "bottom-outside", format: "n", size: 10, color: "#1a1a1a", marginIn: 0.4 };
```

Which number goes on a page, and which pages get one:

```js file=apps/ZEditor/src/model/pageNumbers.js
  const position = pageIdx + 1;
  const last = settings.to > 0 ? Math.min(settings.to, pageCount) : pageCount;
  if (position < settings.from || position > last) return null;
  const number = settings.first + (position - settings.from);
```

The booklet rule for the outer corner:

```js file=apps/ZEditor/src/model/pageNumbers.js
  if (place.endsWith("-outside")) place = place.replace("outside", position % 2 === 1 ? "right" : "left");
```

The live preview, positioned in editor pixels:

```js file=apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
            [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
```

The PDF export asks the same function:

```js file=apps/ZEditor/src/io/pdfExport.js
    const canvas = await renderPageToCanvas(picturePage, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
```

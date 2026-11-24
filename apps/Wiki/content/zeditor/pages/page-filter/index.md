## Intro

A **page filter** gives a page a photocopier or screen-print look: grayscale, duotone, threshold or halftone. It is applied to the page's background and to the images placed on it. Your pen strokes and text are never filtered, so they stay crisp on top. The same code draws the live preview and the exported PDF, so what you see is what you print.

## How to use

1. Open **Page menu → Filter**. The switch turns the filter on or off; **Customize…** opens its settings.
2. Pick a type: **Grayscale**, **Duotone** (choose a dark and a light tone), **Threshold** (cut-off, ink and paper colours) or **Halftone** (colour mode, screen, dots↔lines, size, angle, ink colour).
3. The filter belongs to the **page(s) you have selected**. Shift+click several pages in the sidebar to set them all at once; other pages keep their own setting.
4. Turning the switch off remembers the type, so turning it on again brings it back with its settings.
5. Each **image** has its own filter choice in its Format panel: **Match Page** (the default, follows the page), **None** (opt out), any of the page filters, or **Xerox**, which exists only for single images.

> **Note** The next four pages explain the filters one by one: [Halftone](zeditor/pages/page-filter/halftone), [Xerox](zeditor/pages/page-filter/xerox), [Luma](zeditor/pages/page-filter/luma) (the brightness measure they share) and [Colour remap](zeditor/pages/page-filter/colour-remap) (grayscale, duotone and threshold).

## How it works

### The filter is a property of the page

A page is `{ …, annotations, filter }`. Changing the filter makes a new page object for each selected page with the patch merged in (`{ ...p.filter, ...patch }`), so the change is one undo step and the sidebar thumbnails notice it by reference.

### Which filter does an image get?

One small function settles it, and it is the reason "Match Page" is the default:

| Image's filter | Result |
|---|---|
| none set, or "Match Page" | the page's filter |
| "None" | no filter, even if the page has one |
| anything else | the image's own filter and settings |

### Canvas filters replace pixels

Grayscale, duotone, threshold, halftone and xerox all work on the **pixels** of a canvas: read them with `getImageData`, change them, write them back with `putImageData`. `applyPageFilter` is just the dispatcher: it picks the right routine for the type. Pen and text are drawn after the filter, which is why they stay crisp.

### Preview and export agree

Sizes in the settings (a halftone cell, for example) are in **editor pixels**. The dispatcher receives a `scaleFactor` that converts them to the canvas's real resolution: 1 on screen, a larger number on export. Without it a halftone would look coarse on screen and fine in the PDF.

### Transparency is kept

An image with see-through parts keeps its own alpha after a halftone: the paper and the dots only show where the image was.

## Code

Which filter an image really gets:

```js file=apps/ZEditor/src/model/pageFilters.js
export function effectiveImageFilter(ann, pageFilter) {
  const f = ann.filter;
  if (!f || f.type === "match") return pageFilter || { type: "none" };
  if (f.type === "none") return { type: "none" };
  return f;
}
```

Setting the filter on every selected page (and merging the patch):

```js file=apps/ZEditor/src/state/useAnnotationEdits.js
    const targets = new Set([selectedIdx, ...selectedPageIndices]);
    recordUndoCheckpoint("pagefilter:" + [...targets].sort((a, b) => a - b).join(","));
    setPages((prev) => prev.map((p, i) => (targets.has(i) ? { ...p, filter: { ...(p.filter || DEFAULT_PAGE_FILTER), ...patch } } : p)));
```

The dispatcher:

```js file=apps/ZEditor/src/render/filters/applyFilter.js
  if (filter.type === "grayscale" || filter.type === "duotone" || filter.type === "threshold") {
    applyColorRemap(ctx, canvas, filter);
  } else if (filter.type === "halftone") {
```

```js file=apps/ZEditor/src/render/filters/applyFilter.js
  } else if (filter.type === "xerox") {
    applyXerox(ctx, canvas, filter, scaleFactor);
  }
```

Keeping the image's transparency after a halftone:

```js file=apps/ZEditor/src/render/filters/applyFilter.js
      for (let p = 0; p < sourceAlpha.length; p++) result.data[p * 4 + 3] = sourceAlpha[p];
```

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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Which filter does an image really get?

```js file=apps/ZEditor/src/model/pageFilters.js fn=effectiveImageFilter
```

**The Logic:** `ann` is the image item, `pageFilter` the filter of its page. `!f` is true when no filter is set (`!` means "not"). `||` means "or", `===` "is exactly equal to". Three rules, checked from the top, each ending in `return` (which stops the function): no filter or "Match Page" gives the page's filter (or "none" if the page has none); "None" gives no filter; anything else gives the image's own.

### Setting the filter on the selected pages

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=updatePageFilter
```

**The Logic:**
- `new Set([selectedIdx, ...selectedPageIndices])` makes a collection of the page numbers to change; a `Set` cannot contain the same number twice.
- `recordUndoCheckpoint("pagefilter:" + ...)` saves an undo step. The text it is given is the **coalesce key**: dragging a colour picker fires many updates with the same key, and they are merged into one undo step.
- `setPages((prev) => prev.map((p, i) => targets.has(i) ? {...} : p))` goes through all pages: a targeted page becomes a **new** object whose `filter` is the old filter with `patch` laid over it (`{ ...old, ...patch }`: later fields win); other pages are returned as they were.

### The dispatcher

```js file=apps/ZEditor/src/render/filters/applyFilter.js fn=applyPageFilter
```

**The Logic:**
- The first line **guards**: no filter, type "none" or an empty canvas means there is nothing to do.
- `if / else if` picks the routine by type. Grayscale, duotone and threshold go to `applyColorRemap`; xerox to `applyXerox`.
- Halftone replaces pixels instead of tweaking them, so the function first copies out the picture's **alpha channel** (its see-through-ness: one number per pixel, 0 to 255) into `sourceAlpha`, a `Uint8ClampedArray` (a typed array: a fixed-size list of whole numbers 0–255 that is fast and memory-light). `imageData.data` holds four numbers per pixel (red, green, blue, alpha), so pixel `p`'s alpha is at `p * 4 + 3`.
- After the screen is drawn, if any pixel was see-through (`hasTransparency`), the saved alpha values are written back with `putImageData`, so see-through parts of the image stay see-through.
- `cellSize * scaleFactor` converts the size from editor pixels to the canvas's real resolution (1 on screen, larger in the export).

## Intro

**Insert Image** puts a picture on the page. It can be a photo (PNG, JPG, WebP, GIF…) or an **SVG** vector drawing, chosen from a file, dragged in from a folder or another website, or pasted from the clipboard. Once placed, a picture is an item like any other: move, resize, rotate, crop, filter, group.

## How to use

- Press **I** or choose **Insert Image** in the toolbar, then pick a file. It appears in the middle of the page, at most 260 px wide, selected.
- **Drag** pictures in from a folder or from another web page (up to 12 at once). They land where you drop them.
- **Paste** (Ctrl+V) a screenshot or an image copied from anywhere.
- An SVG is turned into a picture when it is inserted, so it behaves like any other picture (crop, filters, eraser, Vectorize).
- Resize with a handle; **Shift** stretches it freely (images keep their proportions by default).

## How it works

### The file becomes text

The picture is read with a `FileReader` and stored **inside the item** as a **data URL**: the whole file written as base64 text after `data:image/png;base64,`. This is why a saved project contains its pictures and never links to files on your computer. The original bytes are kept: nothing is recompressed.

### Starting size and place

A picture is shown at its natural size, but no wider than 260 px (`scale = 260 / width`), keeping its proportions. It is centred on the page, or, if dropped, centred on the drop point and kept inside the page.

### SVG: vector to pixels

An **SVG** (Scalable Vector Graphics) file describes shapes with maths, not pixels. ZEditor draws it once onto a canvas and keeps the result as a high-resolution **PNG**, so every picture tool works on it. Two things have to be worked out first:
- The SVG's **size**. It may give `width` and `height` in various **units** (px, pt, pc, in, cm, mm), only a `viewBox`, or nothing. Units are converted to CSS pixels (96 per inch); missing sizes are derived from the viewBox's proportions; with neither, the browser's default 300 × 150 is used.
- The **output resolution**: the longest side is drawn at 2048 px, plenty for print at zine sizes.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `svgLength` and `svgSize`

```js file=shared/js/imageFiles.js fn=svgLength,svgSize
```

**The Logic:**
- `UNIT_PX` is a table: how many CSS pixels one of each unit is (1 inch = 96 px, so 1 pt = 96/72 px and 1 mm = 96/25.4 px).
- `svgLength` reads text like `"10cm"` with a **regular expression**: `^\s*([\d.]+)\s*(px|pt|pc|in|cm|mm)?\s*$` means "optional spaces, a number (digits and dots), optional spaces, an optional unit, optional spaces". `m[1]` is the number, `m[2]` the unit (px if missing). Percent and em units do not match, so it returns `null` (unknown).
- `svgSize` splits the `viewBox` text ("0 0 100 50") on spaces or commas, converts to numbers, and accepts it only if it has four finite numbers and a positive width and height. If a viewBox exists: with no width and no height, its size is used; with only one given, the other is derived keeping the viewBox's proportions (`height * (vb[2] / vb[3])`). `width || 300` is the final fallback.

**Worked example.**
- `<svg viewBox="0 0 100 50">` (no width or height): size **100 × 50**.
- `<svg width="10cm" height="5cm">`: `10 × 96 / 2.54 = 377.95` and 188.98 px.
- `<svg width="200" viewBox="0 0 100 50">`: width 200, no height, so `height = 200 × (50 / 100) =` **100**.
- `<svg width="50%">`: `%` does not match, so the width is unknown; with no viewBox the result is the default **300 × 150**.

### `svgFileToPng`

```js file=shared/js/imageFiles.js fn=svgFileToPng
```

**The Logic:**
- `file.text()` reads the SVG as text; it returns a **Promise**, so `.then(...)` continues when it is ready, and the inner `new Promise` lets the function report success (`resolve`) or failure (`reject`) later.
- `DOMParser` turns the text into a document. A broken file yields a `parsererror` element, or a root that is not `svg`: rejected with a friendly message.
- `scale = maxSide / Math.max(width, height)` makes the longest side `maxSide` (2048). Without a viewBox, one is added so the drawing scales with the new size; the explicit pixel `width`/`height` are set.
- The edited SVG is written back out as text (`XMLSerializer`), made into a data URL (`encodeURIComponent` makes the text safe inside it), and loaded into an `Image`. When it loads, it is drawn onto a canvas of the output size and `toDataURL("image/png")` produces the picture. The *original* width and height are returned, so the item starts at the SVG's own size.

**Worked example.** A viewBox-only SVG of 100 × 50: `scale = 2048 / 100 = 20.48`, so `outW = 2048`, `outH = round(50 × 20.48) = 1024`. It is stored as a 2048 × 1024 PNG but placed at its own 100 × 50 size, so it stays sharp when you enlarge it up to about 20 times.

### `placeImage` (inside `addImageAnnotationFromFile`)

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=placeImage
```

**The Logic:** `shownW/H` are given only for SVGs (the size to start from). `scale` is `MAX_W / baseW` when the picture is wider than 260, otherwise 1. `display` is the page's size on screen (`await getPageDisplaySize(...)`, since a PDF page's size is read from the PDF). If the picture was dropped (`opts.center`), its middle goes to the drop point but is **clamped** (`Math.min(Math.max(0, …), …)`) so the whole picture stays on the page; otherwise it is centred (`(display.width − width) / 2`). The new item stores its natural size (for later cropping), the data URL, and is appended, selected, with the Move tool.

**Worked example.** A 1000 × 500 photo on an A4 page (654.8 × 926.1 px): `scale = 260 / 1000 = 0.26`, so it is **260 × 130**; centred: `x = (654.8 − 260) / 2 = 197.4`, `y = (926.1 − 130) / 2 = 398.05`. Dropped with its centre at (300, 400): `x = min(max(0, 300 − 130), max(0, 654.8 − 260)) = 170`, `y = 335`. Dropped at (20, 20): `x = max(0, 20 − 130) = 0`: pushed back inside the page.

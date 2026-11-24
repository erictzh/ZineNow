## Intro

**Export as PNG, JPG or SVG** saves pictures instead of a PDF. **PNG** and **JPG** save the **page you are on** as one picture file. **SVG** saves only the **layers you have selected** as a vector drawing that stays sharp at any size and can be opened in a vector editor.

## How to use

**Export menu:**
- **Export page as PNG (transparent):** the current page as a picture with a **see-through paper**, so only your items show. Good for stickers, overlays or putting a page on a coloured background.
- **Export page as JPG:** the current page on **white**, in a small file (quality 95%). Good for sharing or posting.
- **Export selection as SVG:** select layers first, then choose it. The file is **cropped** to those layers, has a see-through background, and contains nothing else from the page. Vectorized images, shapes, pen strokes and plain text stay editable vectors. Photos and items with effects (shadow, texture, text with stroke or gradient) go in as pictures of themselves. After saving, a notice says what went in as a picture, which fonts the text uses (it looks right where that font is installed), and that clipping masks are not applied.
- File names come from the zine title. A zine of several pages adds the page number, padded so the files sort in order: `Issue 3-page-02.png`; a one-page zine adds nothing.

## How it works

### PNG and JPG

The page is drawn on a canvas at **200 dpi**, exactly like the PDF export ([Export PDF](zeditor/project/export-pdf)): paper, page filter, items, page number. The difference is the paper: **JPG** has white paper; **PNG** leaves the paper **transparent** (the *alpha* channel, the "see-through" amount of each pixel, stays 0 where nothing is drawn). The canvas is then **encoded** (compressed into the file format) by the browser's `toBlob`. A **Blob** is the browser's name for a chunk of file data in memory. JPG is lossy (it throws away detail the eye does not notice, hence the quality number); PNG is lossless.

### SVG

An **SVG** is a text file of drawing instructions (`<rect>`, `<path>`, `<text>`), so it has no pixels and never gets blurry. Each selected layer is turned into such instructions: vector layers directly; anything SVG cannot hold (a photo, a drop shadow, a texture) is first **baked** into a PNG picture and placed as an `<image>`. Rotation, opacity and blend mode wrap each layer in a `<g>` (group). The file's size is the layers' bounding box plus 1 px, and the `viewBox` is the window onto the drawing's own coordinates.

### Colours

Editor colours are CSS strings like `rgba(255,128,0,0.5)`. Some vector editors ignore `rgba()` in SVG, so the colour and the opacity are written as two separate attributes.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `renderPageImageBlob`

```js file=apps/ZEditor/src/io/imageExport.js fn=renderPageImageBlob
```

**The Logic:** `IMAGE_FORMATS` (just above, lines 9–12) is a small table of the two formats: the **MIME type** (the standard name of a file type, like `image/png`), the extension, and whether the paper is transparent. The function looks up the page and waits for the outlines of images that wrap text by shape to be ready. `renderPageToCanvas` draws the page at `EXPORT_SCALE` (200 / 72 = 2.78 pixels per point), with the page's filter, its page-number mark and the `transparent` flag. `canvas.toBlob` encodes asynchronously and calls back, so it is wrapped in a **Promise**: a Promise is a placeholder for a result that arrives later; `resolve(blob)` completes it, `reject(error)` fails it, and `await` in the caller waits for it. A `null` blob means encoding failed.

**Worked example.** An A5 page (419.53 × 595.28 pt) → canvas **1165 × 1654 px**. As a JPG with quality 0.95, a mostly-white page may be around 150 KB; the same page as a PNG with a transparent paper is larger for photos but exact. A 12-page zine titled "Issue 3": page 2 is named `Issue 3-page-02.png` (12 has two digits, so the number is padded to two); in a 5-page zine page 2 is `Issue 3-page-2.png`; a 1-page zine gives `Issue 3.png`.

### `handleExportImage`

```js file=apps/ZEditor/src/state/useExport.js fn=handleExportImage
```

**The Logic:** it does nothing if no page is selected or another export is running (`exporting`). It clears old messages, sets `exporting` (which greys out the menu items), renders the blob, and asks `saveFile` to save it ([The .znow file](zeditor/project/znow-file)): a Save dialog where the browser supports it, a download otherwise. `finally` always turns `exporting` off, even after an error; an error becomes a readable message ("Couldn't export PNG — …").

### `svgColor` and `wrapItem`

```js file=apps/ZEditor/src/io/svgExport.js fn=svgColor,wrapItem
```

**The Logic:** `svgColor` uses a **regular expression** (a pattern language for text) to find `rgb(` or `rgba(` and capture what is inside the brackets; it splits that on commas into numbers `r, g, b` and an optional alpha (default 1, fully visible). Plain `#rrggbb` text is returned as is. `wrapItem` collects attributes for a group: a rotation `rotate(angle cx cy)` about the box's middle, an `opacity`, and a `mix-blend-mode`; if there are none, the drawing is returned unwrapped. `num` (just above) rounds to two decimals so the file stays small.

**Worked example.** `svgColor("rgba(255,128,0,0.5)")` → colour `rgb(255,128,0)`, opacity **0.5**. A layer at x = 20, y = 30, 100 × 50, rotated 30° and 80% opaque: the centre is `(20 + 50, 30 + 25) = (70, 55)`, so it becomes `<g transform="rotate(30 70 55)" opacity="0.8">…</g>`.

### `layersToSvg`

```js file=apps/ZEditor/src/io/svgExport.js fn=layersToSvg
```

**The Logic:**
- It loops over the chosen layers and decides each one's route. A vectorized `trace`, a `rect` shape (without a shadow or texture), a pen `stroke`, and a text box with a plain look (`plainTextLook`) are written as vector instructions. Everything else goes into the `else` branch: it is **baked** into a patch image (`flattenedImagePatch` for photos, `rasterizedTextPatch`, `rasterizedRectPatch`) and counted in `pictures`. Rotation was baked in, so the wrapper gets `angle: undefined`.
- The picture's **bounds** are the union of every layer's box: the smallest `x`, `y` and largest right and bottom edges (`reduce` walks the list keeping a running box). A vectorized layer uses its *visible* shapes' box so hidden colours leave no margin.
- `vb` is the `viewBox`: the box plus `pad` (1 px) on each side. The file's `width` and `height` are the box divided by `MAIN_SCALE` (1.1), turning the editor's pixels back into **points** (1/72 inch), so the SVG has the size the layers have on the page.
- It returns the text of the file with counts used by the notice.

**Worked example.** One 100 × 50 rectangle at x = 20, y = 30: bounds `x 20…120`, `y 30…80`; `vb = { x: 19, y: 29, w: 102, h: 52 }`; the file says `width="92.73pt" height="47.27pt" viewBox="19 29 102 52"` (102 ÷ 1.1 = 92.73; 52 ÷ 1.1 = 47.27). Two layers, one at `x 0…50` and another at `x 200…260`, share a box of `x −1…261`.

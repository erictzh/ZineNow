## Intro

**Export PDF** makes the finished print-ready PDF. Each page is drawn as a high-quality picture (200 dpi), and the text that can be written as **real text** is put on top, with its font embedded, so it stays sharp at any size, can be selected and searched, and prints as type rather than pixels.

## How to use

**Export → Export PDF.** The file is named after the zine title. When it finishes, a notice says how many text boxes were written as real text and how many stayed pictures, and why. It warns about **overset text**: a frame with more text than fits (the rest is not in the PDF).
- To keep text as real text, make sure its font is available: **upload** the font (font menu → Upload Font File) or allow **Load Local System Fonts** in Chrome or Edge.
- A text box stays a picture if it has an effect that PDF text cannot do (stroke, shadow, gradient, photo fill, ransom, curve, distress, stacked letters), a double or wavy strike-through, small caps, a rounded label, a blend mode, an opacity below 100%, complex scripts (Arabic, Hindi, Thai…), custom spans in a different font, size, bold or italic, or if another item sits on top of it.
- The same PDF is used by **Send to ZineArranger**.

## How it works

### A picture of each page

For each page the editor builds a **canvas** at **200 dpi** (the page's size in points times `200 / 72`): first the paper (a PDF page drawn by pdf.js, or white for a blank page), then the page filter, then every item in stacking order, then the page number. The canvas is encoded as a PNG and embedded in a new PDF page of the same size (`pdf-lib`). So everything, any effect, any filter, comes out exactly as on screen.

### Real text on top

Pictures of text are bigger, blurry when zoomed and cannot be searched. So text boxes that **can** be written faithfully are **left out of the picture** and written on top as real text, using the **same layout** the picture renderer uses, so nothing moves. For each text box, the exporter decides:
1. **Blockers:** features PDF text cannot express (the list above).
2. **A font file:** it must be reachable (uploaded, embedded, or a system font with permission).
3. **Glyphs:** every character must exist in the font.
4. **Nothing above it:** the text is written **after** the picture, so anything that stays in the picture and overlaps a text box would wrongly end up *under* it. It works from the top item down: whatever stays a picture can cover the boxes below it, turning them into pictures too.

### Embedding and subsetting the font

The font file is embedded with **fontkit** and **subsetting**: only the characters actually used are included, which keeps the PDF small.

### Words in one piece, or letter by letter

A browser lays out text with kerning, ligatures and tracking, and a PDF writes text with the font's plain **advance widths**. If the PDF's width of a word is within 3% of the font size of the browser's width, the word is written in one piece (so it is selectable text). Otherwise each letter is placed at the browser's own position, so the look is exact even if copying text is less tidy.

### Coordinates: y flips

On a canvas, y grows **downwards** from the top; in a PDF, y grows **upwards** from the bottom. A canvas position `y` (in pixels) becomes `pageHeight − y × (72 / 200)` points.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `buildExportPdfBytes`

```js file=apps/ZEditor/src/io/pdfExport.js fn=buildExportPdfBytes
```

**The Logic:**
- `PDFLib.PDFDocument.create()` makes the new, empty PDF. `createVectorTextExporter` prepares the text exporter. `prepareWrapShapes` waits until the outlines of images that wrap text by their shape have been read.
- For each page: the items are **resolved** (threaded stories, text wrap: [Threads](zeditor/text/threads)). A **preflight** check notes pages where a text frame is overset (`measureTextBox(a).overflow`; the last frame of a thread is the one that matters, hence `a.storyNextId == null`).
- `vectorText.plan(annotations)` returns the ids of the boxes going in as text. `picturePage` is the page **without** them.
- `renderPageToCanvas` draws the page at `EXPORT_SCALE`; `canvasToArrayBuffer` encodes a PNG; `embedPng` puts it in the PDF; `addPage([w, h])` makes a page of the right size in points (canvas pixels ÷ scale); `drawImage` covers the whole page with the picture.
- The text boxes are then written (`vectorText.draw`) in stacking order, and a report is made. `outDoc.save()` returns the PDF's bytes.

**Worked example.** An A5 page, 419.53 × 595.28 pt: the canvas is `round(419.53 × 200 / 72) =` **1165 × 1654** pixels; the PDF page is `1165 / 2.7778 =` **419.4 pt** wide (the 0.13 pt difference is the rounding to whole pixels). A text box at canvas y = 300 px lies `300 × 0.36 = 108` pt from the top, so its PDF y is `594 − 108 =` **486** (from the bottom).

### `renderPageToCanvas` and `paintPageContent`

```js file=apps/ZEditor/src/render/pageRender.js fn=renderPageToCanvas,paintPageContent
```

**The Logic:** a blank page gets a canvas of its size (swapped for 90°/270° rotation) filled white (unless `transparent`). A PDF page is drawn by pdf.js at the export scale and rotation (`getViewport`), with a see-through background if asked. `scaleFactor = exportScale / MAIN_SCALE` converts the items' editor coordinates to export pixels. `paintPageContent` applies the page filter to the paper alone (before any item touches the canvas), resolves the items, and draws them bottom to top with `drawPageItem` (which handles clipping masks). Finally the page number is drawn last.

### `blockerFor`

```js file=apps/ZEditor/src/io/vectorText.js fn=blockerFor
```

**The Logic:** a chain of early returns, each naming a reason (used in the report). Empty text is skipped; any effect (`look.stroke || look.shadow || …`) makes it a picture; double or wavy strike-through, small caps, a rounded label (a radius above 0), a blend mode, an opacity below 1 (`opacityOf(ann) < 1`), complex scripts (the regular expression `COMPLEX_SCRIPT` tests for characters in the Hebrew, Arabic, Indic, Thai, Lao, Myanmar and Khmer ranges) and spans with another font, size, weight or style. If none apply it returns `null`: eligible.

### `coveredRect` and `overlaps`

```js file=apps/ZEditor/src/io/vectorText.js fn=coveredRect,overlaps
```

**The Logic:** the area an item covers, as an axis-aligned box. A stroke is its bounding box plus half its width and 2 px; a text box is its measured size; others use their own width and height. For a rotated item, the **bounding box of a rotated rectangle** is `hw = (w|cos θ| + h|sin θ|) / 2`, `hh = (w|sin θ| + h|cos θ|) / 2` around the centre. `overlaps` is the standard **rectangle intersection** test with 1 px of tolerance: two boxes overlap if each one's left edge is before the other's right edge, and the same for top and bottom.

**Worked example.** A 100 × 50 item rotated 90°: `cos = 0`, `sin = 1`: `hw = (0 + 50) / 2 = 25`, `hh = (100 + 0) / 2 = 50`: the box is **50 wide and 100 tall** around the same centre. Two boxes `x 0…100` and `x 100.5…200` do overlap (within the 1 px tolerance); `x 0…100` and `x 102…200` do not.

### `createVectorTextExporter`: `plan` and `draw`

```js file=apps/ZEditor/src/io/vectorText.js fn=createVectorTextExporter
```

**The Logic:**
- It is a **closure**: it keeps state (`faces`, `counts`, `currentFaces`) in variables that the inner functions share.
- `faceFor(ann)` finds the font file (`resolver.find`) and, if not yet seen, loads it with fontkit (`fk.create`) and embeds it in the PDF (`embedFont(bytes, { subset: true })`). A font collection (`.ttc`) is not supported (`fkFont.fonts`). The result is cached by key, so each font is embedded once.
- `plan(annotations)`: for each visible text box: `blockerFor`; a font via `faceFor`; and the glyph check `face.fkFont.hasGlyphForCodePoint(...)` for every character actually shown (after UPPERCASE and the like). The eligible ones become **candidates**. Then the **top-down overlap pass**: starting from the topmost item, `pictureAbove` collects the boxes of items that stay in the picture; a candidate is accepted if it overlaps none of them, otherwise it becomes a picture (reason "covered") and joins `pictureAbove` itself.
- `draw(outPage, ann, pageHeightPts)` uses the layout engine (`layoutText`, `layoutPlainRuns`) to get each run's position. `toPt` converts canvas px to points and `pdfY` flips the y axis. A rotated box is wrapped in a **graphics state** (`pushGraphicsState`, `translate`, `rotateDegrees`, `translate` back, `popGraphicsState` afterwards). The label box and column rules are drawn as rectangles and lines. Text: each word is drawn in one piece if the PDF's width agrees with the browser's within `fontSize × 0.03`, else letter by letter. Underline and strike-through are thin lines in the letters' colour.
- `describe()` builds the sentence for the notice, with a plural helper.

**Worked example.** Text at 11 pt exported at 200 dpi: `fontSize = 11 × 200 / 72 = 30.56` px, `tolerance = 30.56 × 0.03 =` **0.92** px. A word whose browser width is 193.1 px and PDF width 192.4 px differs by 0.7: within tolerance, written as **one piece**. If the text has tracking so the browser width is 196 px: difference 3.6 px, over the tolerance: it is written **letter by letter** at the browser's positions. In `plan`: a text box at the bottom of the stack and a rectangle above it that overlaps it and has a shadow (so it stays a picture): the text is **covered**, becomes a picture, and is reported as "another item sitting on top of them".

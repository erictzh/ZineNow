## Intro

**Insert PDF** adds the pages of another PDF file into the zine you are working on, at the place you choose. It is also how a PDF you already have becomes pages you can draw and write on top of.

## How to use

1. In the page sidebar, press **Insert PDF** and choose a file.
2. A small dialog asks **Insert after page**: type a page number (0 means the very beginning). It starts at the page after the one you are on.
3. Press **Insert**. All the PDF's pages are added there, and the first inserted page is selected.
4. It is **one undo step**. The sidebar's **Load PDF** (when nothing is open) uses the same code to start a document.
- The inserted pages keep the PDF's own page sizes. New blank pages you add later take the size of the *first* PDF page ever loaded.

## How it works

### pdf.js

Reading a PDF means decoding a complicated file format. ZEditor uses **pdf.js**, Mozilla's open-source PDF reader, which is loaded as a global (`pdfjsLib`). It parses the file, and renders any page onto a canvas on request.

### One thumbnail per page

For every page, a small preview picture is rendered at 0.45 pixels per point (the sidebar thumbnail) and kept as the page's `dataUrl`. The PDF itself stays loaded in memory in a table of documents (`pdfDocsRef`), and each page records which document and page number it came from. Large pages are drawn again at full quality only when needed.

### Keeping the original bytes

A project file embeds the PDF it uses, so the **original bytes must stay intact**. pdf.js may take ownership of the buffer it is given (and empty it), so it gets a **copy** (`bytes.slice(0)`) and the app keeps the original for saving.

### Inserting is a splice

Pages are a list. Inserting is `splice(atIndex, 0, ...newPages)`: "at this position, remove nothing, add these". The list is first copied (`slice()`) so the old list is never edited, as everywhere else in the app.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `importPdfFile`

```js file=apps/ZEditor/src/io/pdfImport.js fn=importPdfFile
```

**The Logic:**
- It is `async`: reading and rendering take time, and `await` pauses until each step is done.
- `file.arrayBuffer()` reads the file's bytes. `pdfjsLib.getDocument({ data: bytes.slice(0) }).promise` opens a **copy** of them.
- `ids.docId()` makes a fresh id for this document, so pages know where they came from.
- The `for` loop goes through pages 1 to `doc.numPages` (PDF page numbers start at 1). Each gets a thumbnail (`await renderPdfThumb`) and is described as an object: a unique `key`, `docId`, `pageNumber`, `rotation: 0`, `dataUrl`, `isBlank: false`, and an empty list of items.
- Page 1's size is read with `getViewport({ scale: 1 })`: scale 1 means one pixel per point, so `vp1.width` is the width in points. The function returns everything the caller needs.

### `renderPdfThumb`

```js file=apps/ZEditor/src/render/pageRender.js fn=renderPdfThumb
```

**The Logic:** the page is fetched (`await doc.getPage`), a **viewport** is asked for at the thumbnail scale with the page's rotation (a viewport is the page's size and orientation at a given zoom), and a canvas of exactly that size is created. `pdfPage.render({ canvasContext, viewport }).promise` draws the page onto it. `canvas.toDataURL()` returns a PNG picture as text. **Worked example.** An A5 page (419.53 × 595.28 pt) at 0.45: a canvas of **188.8 × 267.9** px, which the sidebar shows at 0.3 scale (126 × 179 px, sharp on dense screens).

### `handleConfirmInsertPdf`

```js file=apps/ZEditor/src/state/useDocumentFiles.js fn=handleConfirmInsertPdf
```

**The Logic:** `atIndex` is the typed number, **clamped** into 0…page count (`Math.max(0, Math.min(pages.length, insertAfterPage))`). The dialog's file is cleared (`setPendingInsertFile(null)`) so it closes. While importing, `loading` shows. The imported document is added to the table **without removing the others** (a project can use several PDFs). `recordUndoCheckpoint()` saves the undo step before the pages change. `next.splice(atIndex, 0, ...imported.pages)` inserts them all. The `catch` shows a message if the file is not a readable PDF; `finally` always switches the loading state off.

**Worked example.** A 6-page zine; you are on page 2, so the dialog starts at 3. You insert a 4-page PDF after page 3: `atIndex = 3`: the list becomes pages 1, 2, 3, **A, B, C, D**, then the old 4, 5, 6. Typing 0 puts the four pages first; typing 99 is clamped to 6 and appends them.

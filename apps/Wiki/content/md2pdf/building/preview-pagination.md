## Intro

The preview on the left shows your document **as separate pages**, the same pages the PDF will have. A browser normally shows web pages as one long scroll, so this takes some trickery: a helper library called **Paged.js** cuts the content into page-shaped boxes on screen.

## How to use

- The preview updates as you type or change a setting; "Paginating…" shows in the status bar while it works.
- **Status bar** (under the preview): the **paper size** menu, **Page [n] of N** (type a number and press Enter, or use the arrows, to jump), and **zoom**: a slider from 15% to 200%, a number box and **Fit** (fit the page width to the panel).
- **Drag on the paper** to scroll (hand tool); on a touchscreen, **pinch with two fingers** to zoom.
- **Dark paper** in the gear menu shows the pages dark while you work. Only the preview changes: the PDF stays white.
- If the pagination library cannot load (for example with no internet connection and nothing saved by the browser), the preview shows one long unbroken page with a rough height instead of separate pages.

## How it works

### The sandboxed frame

The preview is an **iframe**: a window inside the page, filled with the complete document HTML. Its `sandbox="allow-scripts"` setting lets the document run its own scripts but **no more**: it has its own separate "origin", so a script slipped in through pasted raw HTML cannot reach the app. (Adding `allow-same-origin` alongside `allow-scripts` would defeat the sandbox.)

### Paged.js cuts pages

Paged.js reads the same `@page` size and margins and the same "keep together" rules used for printing, then physically splits your content into one box per page. When it finishes, its `after` hook runs the page-number script, the contents script ([Table of contents generation](md2pdf/building/toc-generation)), and posts a message to the app: **page count, page-number map, total height**. A sandboxed frame cannot be measured from outside, so **messages** (`postMessage`) are the only way to talk across.

### Fitting and zooming

The frame is `5.83 × 96` pixels wide (96 pixels per inch on screen). It is scaled with CSS `transform: scale(…)`: "Fit" computes the scale that makes the page fill the panel (never above 100%).

### Which page is in view

All pages have the same stride (height plus seam plus gap), so the current page can be worked out **just from the scroll position**, without asking the frame.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `renderHtmlDocument`

```js file=apps/Markdown-to-PDF/src/document/previewDocument.js fn=renderHtmlDocument
```

**The Logic:**
- `buildDocumentParts` ([Markdown to HTML](md2pdf/building/markdown-to-html)) provides the style, body and settings.
- The big `paginationScript` string becomes a `<script>` in the frame. It sets `window.PagedConfig` with an **`after` hook** that Paged.js calls when done. In it: stamp the right page number into each page's bottom-centre box (the fix for the library's bug; see [Page numbers](md2pdf/typography/page-numbers)), fill the contents numbers (`tocFillScript`), then `postMessage` the result to the parent with `source: 'md2ebook-pagedjs'` so the app can recognise it.
- `__contentHeight()` measures `document.body.getBoundingClientRect().height`. It deliberately does not use the document's `scrollHeight`, which can never be less than the frame's own height: after a long document made the frame tall, deleting text could never shrink it back.
- A `load` listener posts a **first, rough** height at once, as a fallback if the library never arrives (offline).
- A `message` listener flips the class `md2ebook-dark-paper` when the app sends `darkPaper` (only from its own parent window: `e.source !== window.parent` is rejected). Dark paper is done by CSS: `filter: invert(0.92) hue-rotate(180deg)` on the pages, and a second inversion on pictures so they look normal.
- Finally the function returns the whole document text: head (fonts, style, page-box rule, dashed outline for blank spaces) and `<body>` with a `<div class="page md2ebook-doc">` holding the body HTML.

**Worked example.** A document of 7 physical pages with Page Start From = 5: the hook stamps `5, 6, 7, 8, 9, 10, 11` on the 7 margin boxes (`pageStartFrom + index`, with the index counting from 0), and posts `{ source: 'md2ebook-pagedjs', tocPages: {…}, pageCount: 7, height: … }`. The height is whatever the frame measures; on A5 each page occupies about `794 + 3 + 24 = 821` px.

### Receiving the report: the app's message handler

```js file=apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  useEffect(() => {
    function handleMessage(event) {
      const data = event.data;
      if (!data || data.source !== "md2ebook-pagedjs") return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      // The frame is up (and maybe freshly re-rendered): tell it whether the paper is dark.
      sendDarkPaper();
      const measuredHeight = Number(data.height);
      if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
        setContentHeightPx(measuredHeight);
      }
      if (data.tocPages && typeof data.tocPages === "object" && onTocPagesRef.current) {
        onTocPagesRef.current(data.tocPages);
      }
      const measuredPages = Number(data.pageCount);
      if (Number.isFinite(measuredPages) && measuredPages > 0) {
        setPageCount(measuredPages);
        setPaginating(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
```

**The Logic:** the handler ignores messages that are not from the preview (`source` check) or from another frame (`event.source`). It then reads the height (kept only if it is a positive number), hands the page map to the app, and the page count (ending the "Paginating…" state). Each check is `Number.isFinite(...)`, which is true only for real numbers: the message is untrusted data crossing from a frame, so each piece is validated before use.

### Scale to fit and the page stride

```js file=apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
  const DPI = 96;
  const pageWidthPx = Math.round(paper.widthIn * DPI);
  const minPageHeightPx = Math.round(paper.heightIn * DPI);
  const renderedHeightPx = Math.max(minPageHeightPx, contentHeightPx);
```

```js file=apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  // Recompute the horizontal scale factor (page width -> available pane width).
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    function recompute() {
      const availableWidth = el.clientWidth - 48; // matches wrapper horizontal padding
      const next = Math.min(1, Math.max(ZOOM_MIN / 100, availableWidth / pageWidthPx));
      setFitScale(next);
    }
    recompute();
    let observer;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(recompute);
      observer.observe(el);
    } else {
      window.addEventListener("resize", recompute);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", recompute);
    };
  }, [pageWidthPx]);
```

**The Logic:** `pageWidthPx = round(inches × 96)`. `recompute` reads the panel's width, subtracts 48 for its padding, and divides by the page width. It is limited to between 15% and 100%. A `ResizeObserver` (a browser feature that notices when an element changes size) calls it again when the panel is resized.

**Worked example.** A5: `5.83 × 96 = 559.68`, so 560 px wide, and `8.27 × 96 = 793.92`, so 794 px tall. A panel 600 px wide: `(600 − 48) / 560 = 0.9857` (98.6%). A 400 px panel: `352 / 560 =` **62.9%**. A 1200 px panel: `1152 / 560 = 2.06`, capped at **100%**.

### The current page, from scrolling

```js file=apps/Markdown-to-PDF/src/ui/PreviewCanvas.jsx
  // and the gap before the next page (the .pagedjs_page rule in document/styleBlock.js), all scaled
  // by the preview's scale — so page n starts at a fixed distance down the pane.
  const pageStridePx = (minPageHeightPx + PAGE_SEAM_PX + PAGE_GAP_PX) * scale;
  // Tracks which page is in view for the status bar, purely from scroll position: the page at the
  // top of the view (the one a page jump scrolls to), or the last page once scrolled to the bottom.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    let ticking = false;
    function computeCurrentPage() {
      ticking = false;
      if (!pageCount || pageCount <= 1) {
        setCurrentPage(1);
        return;
      }
      if (!(pageStridePx > 0)) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setCurrentPage(pageCount);
        return;
      }
      // A page counts as "at the top" once less than a third of it has scrolled out of view.
      const estimated = Math.floor((el.scrollTop - CANVAS_TOP_PAD_PX + pageStridePx / 3) / pageStridePx) + 1;
      setCurrentPage(Math.min(pageCount, Math.max(1, estimated)));
    }
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(computeCurrentPage);
    }
    computeCurrentPage();
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [pageCount, pageStridePx]);
  // Scrolls the preview so page n's top sits at the top of the view (the status bar's page box).
  const goToPage = (n) => {
    const el = outerRef.current;
    if (!el || !pageCount) return;
    const page = Math.min(pageCount, Math.max(1, Math.round(n)));
    el.scrollTop = CANVAS_TOP_PAD_PX + (page - 1) * pageStridePx - 8;
    setCurrentPage(page);
  };
```

**The Logic:** every page is exactly `minPageHeightPx + seam + gap` tall (here 794 + 3 + 24 = **821**) times the scale, so page `n` starts at `40 + (n − 1) × stride` (the 40 is the padding above the first page). `computeCurrentPage` inverts that: it takes the scroll position, subtracts the padding, adds **a third of a page** (so a page counts as "current" once more than two thirds of it has not scrolled away), divides by the stride, and `Math.floor` rounds down. Scrolled to the very bottom, it says "the last page". `requestAnimationFrame` limits the work to once per screen refresh (the `ticking` flag stops a scroll flood from queueing hundreds of calls). `goToPage` does the reverse: scroll to `40 + (n − 1) × stride − 8` (8 px of breathing room).

**Worked example.** Scale 0.5: `stride = 821 × 0.5 = 410.5`. `goToPage(3)`: `scrollTop = 40 + 2 × 410.5 − 8 =` **853**. Reading it back: `floor((853 − 40 + 410.5 / 3) / 410.5) + 1 = floor((813 + 136.8) / 410.5) + 1 = floor(2.31) + 1 =` **3**. At `scrollTop = 600`: `floor((560 + 136.8) / 410.5) + 1 = 1 + 1 = 2`.

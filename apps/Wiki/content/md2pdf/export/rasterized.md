## Intro

The normal PDF is made by the **print dialog**, which never hands your program the PDF's bytes: it goes straight to the file. But **Send to ZineArranger** needs real PDF bytes to pass to the other tab. So the app has a **second route**: it lays the pages out in a hidden frame, takes a **picture of each page**, and assembles the pictures into a PDF itself.

## How to use

- Click **Send to ZineArranger** in the top bar. ZineArranger opens in a new tab and your document arrives in it ([Send to ZineArranger](zeditor/project/send-to-zinearranger) explains the hand-off).
- The result is a PDF whose pages are **pictures** (about 192 dpi). Text in it cannot be selected or searched, and the file is larger than the one from Download PDF. This is fine for imposing and printing; for a PDF to keep or share, use **Download PDF eBook**.
- If rendering takes over **60 seconds**, you get *Rendering the document for export timed out.*

## How it works

1. **Hidden frame:** a frame the size of one page (`inches × 96`), moved far off the screen (`left: -99999px`). Its sandbox is `allow-scripts allow-same-origin`.
2. **Pagination** with Paged.js, as in the preview, but without the preview's gap and dark seam between pages (they would be photographed as stray lines).
3. **Photograph each page** with a library called **html2canvas**: it draws an HTML element onto a canvas. The scale is 2, so 96 dpi becomes about **192 dpi**. Pages are captured **one at a time**.
4. **Send the pictures back** to the app with `postMessage` as PNG bytes, together with the paper size.
5. **Assemble** with **pdf-lib**: for each picture, add a PDF page of the paper's size in **points** (`inches × 72`) and draw the picture over the whole page.
6. **Hand over** to the other tab.

### Why sanitising matters

html2canvas hangs inside a sandboxed frame without `allow-same-origin`. But with `allow-scripts` **and** `allow-same-origin` together, a script inside the frame could reach out and control the app. The Markdown may contain raw HTML with a `<script>`. So the HTML is first passed through **DOMPurify**, a library that removes anything dangerous (scripts, event handlers), *before* it enters the frame. That, not the sandbox, is what makes this safe.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `buildPageBoxRuleForCapture`

```js file=apps/Markdown-to-PDF/src/export/rasterDocument.js fn=buildPageBoxRuleForCapture
```

**The Logic:** the same `@page` size, margins and page-number CSS as the preview, but it ends by zeroing the gap and the seam under each page (`margin-bottom: 0`, `border-bottom: none`, both `!important` so they win over the library's own styles). Each page is photographed alone, so a border painted at the bottom of the page box would appear as a line at the bottom of the picture.

### `renderRasterizationDocument`

```js file=apps/Markdown-to-PDF/src/export/rasterDocument.js fn=renderRasterizationDocument
```

**The Logic:**
- `DOMPurify.sanitize(parts.bodyHtml)` cleans the HTML.
- The embedded `script` text is written into the frame. Its `after` hook (run by Paged.js when layout is finished) stamps page numbers, fills the contents numbers (`tocFillScript`), then starts `captureNext`, which processes **one page, then the next**. This is a recursive chain: when a page's picture is ready, `captureNext()` calls itself for the next one (`i++`).
- Each step: `html2canvas(page, { scale: 2, backgroundColor: "#ffffff" })` returns a Promise of a canvas; `.toBlob` turns it into PNG data; `.arrayBuffer()` turns that into raw bytes; the bytes are pushed to the list. `.catch(fail)` sends any failure to the parent as an error message.
- When all pages are done, **one** message goes to the parent, containing the list of pictures and `widthIn`/`heightIn`. The third argument `buffers` makes it a **transfer**: ownership of the bytes moves instead of being copied.
- The same function appends the library tags (html2canvas, Paged.js) and builds the full HTML text.

**Worked example.** A5: the frame is `round(5.83 × 96) = 560` wide by `round(8.27 × 96) = 794` tall. At scale 2 each page picture is `1120 × 1588` pixels. A 12-page document gives 12 PNGs of roughly `1120 × 1588` px each. The PDF page size is `5.83 × 72 = 419.76` by `8.27 × 72 = 595.44` points.

### Assembling the PDF and handing over

```js file=apps/Markdown-to-PDF/src/ui/App.jsx
  async function handleSendToZineArranger() {
    if (isSendingToArranger) return;
    setExportError(null);
    setIsSendingToArranger(true);
    let iframe = null;
    // sendPdfToZineArranger opens the tab and starts listening for its
    // "ready" ping before calling this, so the ping can't be missed while
    // pages are still being rendered/rasterized here.
    async function buildBytes() {
      const paper = PAPER_SIZES[config.paperSize] || PAPER_SIZES.a4;
      const DPI = 96;
      const rasterResult = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener("message", onRasterMessage);
          reject(new Error("Rendering the document for export timed out."));
        }, 60000);
        function onRasterMessage(event) {
          if (!iframe || event.source !== iframe.contentWindow) return;
          const data = event.data;
          if (!data || data.source !== "md2ebook-rasterize") return;
          if (data.error) {
            clearTimeout(timeoutId);
            window.removeEventListener("message", onRasterMessage);
            reject(new Error(data.error));
            return;
          }
          if (!Array.isArray(data.images)) return; // not the final message yet
          clearTimeout(timeoutId);
          window.removeEventListener("message", onRasterMessage);
          resolve(data);
        }
        window.addEventListener("message", onRasterMessage);
        // Unlike the live preview's iframe, this one needs
        // allow-same-origin alongside allow-scripts — confirmed
        // html2canvas hangs indefinitely without it. That's safe
        // here specifically because renderRasterizationDocument
        // sanitizes the rendered HTML with DOMPurify first (see
        // its comment in export/printExport.js), which is what actually
        // keeps a smuggled <script> in pasted raw HTML from
        // reaching out to this app, not the sandbox by itself.
        // Positioned off-page rather than sized to 0 (needs real
        // pixel dimensions for Paged.js to lay pages out against)
        // — harmless, since that positioning has no bearing on
        // the html2canvas capture happening inside the iframe's
        // own separate document.
        iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.style.position = "fixed";
        iframe.style.left = "-99999px";
        iframe.style.top = "0";
        iframe.style.border = "0";
        iframe.width = String(Math.round(paper.widthIn * DPI));
        iframe.height = String(Math.round(paper.heightIn * DPI));
        iframe.srcdoc = renderRasterizationDocument(markdown, config);
        document.body.appendChild(iframe);
      });
      const { PDFDocument } = window.PDFLib;
      const outDoc = await PDFDocument.create();
      const pageWidthPts = rasterResult.widthIn * 72;
      const pageHeightPts = rasterResult.heightIn * 72;
      for (const img of rasterResult.images) {
        const pngImage = await outDoc.embedPng(img.buffer);
        const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
        outPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pageWidthPts,
          height: pageHeightPts,
        });
      }
      return outDoc.save();
    }
    try {
      await sendPdfToZineArranger(buildBytes, deriveFilename(markdown));
    } catch (err) {
      setExportError("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      setIsSendingToArranger(false);
    }
  }
```

**The Logic:**
- `if (isSendingToArranger) return` blocks a second click. `sendPdfToZineArranger` opens the tab and starts listening **first**, then calls `buildBytes` (the function in the middle), so the ready message cannot be missed while pages render.
- `buildBytes` creates the frame and waits for its message with a **Promise** and a 60-second timeout. `onRasterMessage` accepts only messages from this frame (`event.source === iframe.contentWindow`) whose `source` is `md2ebook-rasterize`; an `error` field rejects the promise; a message without `images` is "not final yet" and ignored.
- Then `PDFDocument.create()` makes an empty PDF; for each picture: `embedPng` stores the PNG in the PDF, `addPage([w, h])` adds a page of the paper's size in points, and `drawImage` paints it from the corner `(0, 0)` stretched to the whole page. `save()` returns the PDF bytes.
- `finally` removes the frame and re-enables the button, whatever happened.

**Worked example.** Three page pictures on A5: three PDF pages each `419.76 × 595.44` pt, each wholly covered by its picture. The file is mostly the three PNG pictures; the same document from Download PDF is normally much smaller, because text is stored as text.

## Intro

**Download PDF eBook** makes the real PDF by handing your document to the **browser's own print engine**. You then choose **Save as PDF** as the destination in the print dialog. The result has **real, selectable text** with the fonts embedded, and sharp lines at any zoom, because the browser prints it rather than taking pictures of it.

## How to use

1. Click **Download PDF eBook** (top right). The button reads *Opening Print Dialog…* while it works.
2. In the print dialog, set **Destination** to **Save as PDF**. Leave **Margins** at *Default* and **Scale** at 100%: the page size and margins are already set by the app (the `@page` rule).
3. Save. The suggested file name comes from the document's first `# Heading` (lower case, spaces as dashes, at most 60 characters), or `md-to-pdf-converter.pdf` if it has none.
- Contents page numbers are the numbers the preview measured, so wait for "Paginating…" to finish in the preview before exporting.
- An error (for example the print frame failed to load) shows in a red strip with a **Dismiss** button.

## How it works

1. **Build the document** with the same function as the preview ([Markdown to HTML](md2pdf/building/markdown-to-html)), so the two match.
2. **Add print-only CSS:** an `@page` rule with the **exact paper size** and the **margins**, plus the page-number box. The margin is done by `@page`, not by padding, because padding applies only at the start and end of the whole text, but `@page` margins apply to **every** sheet.
3. **Put it in a hidden iframe:** a zero-size, invisible frame is added to the page and filled with the document. (Earlier versions used a pop-up window, but browsers often block pop-ups from files opened from disk, and a hidden frame is never blocked.)
4. **Wait for the fonts** (`document.fonts.ready`, a promise that resolves when all fonts are loaded) then an extra 150 ms.
5. **Call `print()`** on the frame's window. The browser shows its print dialog for that frame only.
6. **Clean up** when the browser says printing finished (the `afterprint` event), or after 60 seconds, since a few browsers never send it.

**Safety.** Your Markdown may contain raw HTML with a hidden `<script>`. The print frame is created with `sandbox="allow-same-origin allow-modals"`. It does **not** include `allow-scripts`, so scripts in it simply do not run. (`allow-modals` is needed because `print()` counts as a modal dialog.)

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `exportToPdf`

```js file=apps/Markdown-to-PDF/src/export/printExport.js fn=exportToPdf
```

**The Logic:**
- It returns a **Promise**, a placeholder resolved with `resolve()` when done and failed with `reject(error)` if something goes wrong. The caller `await`s it.
- `parts.normalized.filename.replace(/\.pdf$/i, '')` strips a trailing `.pdf` (the pattern: a literal dot, `pdf`, at the end of the text, any case) to make the document title, which becomes the print dialog's suggested name.
- `printOnlyCss` is **built as text**: `@page { size: 5.83in 8.27in; margin: 0.75in 0.75in; … }` then `@media print { .page { width: 100%; padding: 0; … } }`. `.page` has its on-screen width and padding switched off, since `@page` now provides the margins (keeping them would double them).
- `printDoc` is the whole HTML document: title (escaped with `escapeHtml`), the font tags, the style block and print CSS, the body.
- The iframe is positioned in a corner at 0 × 0 and `visibility: hidden`. `onload` runs when the document has loaded. `settled` is a flag making sure the promise finishes only **once**, however many ways it might finish (`settleResolve`, `settleReject`, the timer).
- In `onload`: `fontsReady` is the browser's font-readiness promise, or an already-resolved one if unsupported. `.catch(…)` ignores a failure there. In `.then`, a 150 ms `setTimeout` gives the layout a moment, then `win.addEventListener('afterprint', …)`, `win.focus()` and `win.print()`. The 60-second timer is the safety net.

**Worked example.** Markdown starting `# My Zine: Issue #1!`: the suggested file is `my-zine-issue-1.pdf` (`deriveFilename` lower-cases it, deletes characters other than letters, digits, spaces and dashes, then turns spaces into dashes). On A5 with default margins the print CSS contains `size: 5.83in 8.27in; margin: 0.75in 0.75in;`, a printable area of `4.33 × 6.77` inches, and the result is a PDF of A5 pages. A Markdown heading `# ` with only symbols (`# !!!`) gives an empty slug and falls back to the name `md2ebook.pdf`.

### The file name: `deriveFilename`

```js file=apps/Markdown-to-PDF/src/ui/App.jsx
  function deriveFilename(md) {
    const match = /^#\s+(.+)$/m.exec(md || "");
    if (!match) return "md-to-pdf-converter.pdf";
    const slug = match[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
    return (slug || "md2ebook") + ".pdf";
  }
```

**The Logic:** `/^#\s+(.+)$/m` finds the first line that is a level-1 heading (`m`: `^` and `$` match at each line). `.replace(/[^a-z0-9\s-]/g, "")` deletes everything except lowercase letters, digits, spaces and dashes (accented letters are deleted too, so `Café` becomes `caf`), then `/\s+/g` turns each run of spaces into one `-`, and `slice(0, 60)` limits the length. If nothing is left, `md2ebook` is used.

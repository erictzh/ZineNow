## Intro

When the sheets look right, **Print / Save PDF** (top right) opens the browser's print dialog. Printing is plain **browser printing**: ZineArranger prepares the page so that every sheet comes out as exactly one sheet of paper, in the right orientation, with no buttons or menus.

## How to use

1. Click **Print / Save PDF**.
2. In the print dialog: choose your printer or **Save as PDF**; set the **paper size** to the one you chose in the app (for example A4); keep **scale 100%** (not "fit to page"); keep **margins** at *None*.
3. For a double-sided zine, choose **two-sided printing** and flip on the **long edge** or **short edge** as the Folding Instructions say.
4. If the log shows the line *Opening the browser print dialog…*, the app has reached this step.
- With **Reverse Impose** the sheet size is set from the pages themselves; see [Reverse imposition](zinearranger/reverse-imposition).

## How it works

Browsers print what the page's **print stylesheet** says. Inside `@media print { … }` rules apply only for printing:
- The page **margin** is 0 (the sheet is the paper).
- Menus, the panel and the log are hidden (`display: none`).
- Each `.zine-sheet` is `--sheet-print-width × --sheet-print-height` (real units, like `297mm × 210mm`) with `break-after: always`, which **forces a new printed page after every sheet**, and `break-inside: avoid`.

### Orientation

The paper's orientation comes from the layout (`portraitPaper`). A separate `<style>` element is rewritten with `@page { size: portrait; }` or `landscape`, so the browser's print dialog starts with the right choice.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `triggerPrint` and `setPageOrientation`

```js file=apps/ZineArranger/src/print.js fn=triggerPrint,setPageOrientation
```

**The Logic:** `window.print()` asks the browser to open its print dialog. `setPageOrientation(prt)` receives true for a portrait sheet, and replaces the contents of the style element `page-orient-style` (using `innerHTML`) with a rule that applies only in print: `@media print { @page { size: portrait; } }`. The commented-out lines are older attempts that set exact sizes in pixels.

**Worked example.** One-sided eighth-size zine: `portraitPaper` is `false`, so the rule is `@media print { @page { size: landscape; } }`. A one-sided quarter-size zine has `portraitPaper: true`: `size: portrait`.

### The print stylesheet

```css file=apps/ZineArranger/style.css
@media print {
    @page {
        margin: 0;
        bleed: 0;
    }

    /* The following two rules are copied verbatim from MD2eBook's own print
       media query. Its third rule there (`.md2ebook-app, .md2ebook-header,
       .md2ebook-sidebar, .md2ebook-preview-pane, .md2ebook-canvas-wrapper {
       all: unset; }`) is intentionally NOT copied — all: unset would reset
       display to inline on those elements, and .md2ebook-preview-pane /
       .md2ebook-canvas-wrapper are still part of the print flow here
       (wrapping the actual zine sheets, unlike in MD2eBook where the
       printed content is a single iframe). This app's own .noprint rule
       below already achieves the same "hide the chrome" result safely for
       the elements that use it. */
    html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
    }

    .md2ebook-no-print {
        display: none !important;
    }

    .zine-sheet {
        /*width: 100vw;
        height: 100vh;*/
        width: var(--sheet-print-width);
        height: var(--sheet-print-height);
        /*float: left;*/
        /*gap: 1.5px;*/
        break-after: always;
        break-inside: avoid;
        /*border: 4px dashed black;*/
    }
```

**The Logic:** the first rule, `@page { margin: 0; bleed: 0; }`, removes the browser's own print margin. `html, body` get no margin, padding, and a white background (`!important` beats every other rule). Hidden elements use `display: none`. The last rule (`.zine-sheet`) is the important one, explained next.

### One sheet per printed page

**The Logic:** `width: var(--sheet-print-width)` reads the variable set by `applySheetSizes` (for example `297mm`), so the printed sheet is the real paper size. `break-after: always` is the **page break** that starts a new paper page after every sheet; `break-inside: avoid` stops one sheet from being split over two pages.

**Worked example.** An A4 eighth-size zine of 16 pages has 2 sheets: the browser prints **2 pages** of `297 mm × 210 mm`, landscape, each completely filled by one sheet. Printing double-sided, sheet 1's back is on the back of the first page, matching the layout's `sides` lists.

### Reverse-impose page size

```js file=apps/ZineArranger/src/print.js fn=setReverseImposePageSize
```

**The Logic:** it finds (or creates) a `<style id="ri-page-size-style">` element in the page's head. With a width and height it writes `@media print { @page { size: 5.846in 8.268in; margin: 0; } }` (`toFixed(3)` limits to three decimals). With `null` it clears it, so normal zine printing uses your paper selection again.

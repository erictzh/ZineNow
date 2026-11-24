## Intro

**Page numbers** can be printed at the **bottom centre** of every page, starting from any number you choose. It uses a real print feature, so the PDF has proper numbers on each physical page.

## How to use

- Tick **Show page number on every page** in the Typography tab (off by default).
- **Page Start From:** the number shown on the first page (default 1); a fraction or zero is not allowed. Use 3 if your PDF is going to be placed after two cover pages.
- The number uses the body font at 10 pt in grey.
- The **table of contents** page numbers (if enabled in the TOC section) agree with these.

## How it works

CSS Paged Media (the print standards) has **margin boxes**: little areas in the page margin that can show generated content. `@bottom-center` is the one in the middle of the bottom margin. Its `content` can be `counter(page)`, a **counter** (a number the browser keeps) that goes up by one per physical page.

To start at another number, the root element gets `counter-reset: page N`, where `N` is **one less** than the first number (the browser adds 1 before drawing the first page). So start 5 means `counter-reset: page 4`.

**The preview's workaround.** The preview paginates with a script library (Paged.js) that has a known bug and ignores the reset. So after layout, the app writes the correct number into each page's margin box itself; the print path uses the browser's own, which is correct.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `toPositiveInteger`

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js fn=toPositiveInteger
```

**The Logic:** reuse `toPositiveNumber` (blank, text or non-positive give the default), then `Math.round` to the nearest whole number: page 3.6 makes no sense.

**Worked example.** `"3.6"` → 4; `"0"` → 1 (the default); `"-5"` → 1; `""` → 1; `"12"` → 12.

### `buildPageNumberCss`

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js fn=buildPageNumberCss
```

**The Logic:** when numbers are off it returns three empty strings, adding nothing. When on, it returns three pieces of CSS text: the **margin box** (`@bottom-center` with `content: counter(page)`, the body font stack, 10 pt, grey `#6b7280`), the **reset** (`html { counter-reset: page 4; }` for start 5: `pageStartFrom - 1`), and the **override rule**, which (only in the preview) replaces the content with the number the script stored in an attribute.

**Worked example.** Start from 5 → `html { counter-reset: page 4; }`; the first page shows 4 + 1 = **5**, the second 6. Default 1 → `counter-reset: page 0` → first page 1.

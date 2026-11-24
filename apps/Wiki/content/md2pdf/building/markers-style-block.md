## Intro

Markdown has no way to say "start a new page", "leave a gap" or "put the contents here". So the editor adds three **markers**, special lines that you type (or insert with the Insert menu). This page also explains the **style block**: the generated CSS that carries all your Typography settings.

## How to use

Put a marker **on a line by itself**:
- `\pagebreak`: what follows starts on a **new page**.
- `\space{N}`: an empty gap **N body-text lines tall** (1 to 200). It is for leaving room to paste a picture into the PDF by hand. In the preview it shows a dashed outline with the label "blank space · N lines". It never splits across a page: if it does not fit, it moves whole to the next page.
- `\toc`: the **table of contents** goes here ([Table of contents generation](md2pdf/building/toc-generation)).

A marker with other text on its line (`text \pagebreak`) is **not** a marker; it stays as ordinary text. Spaces around a marker are fine.

## How it works

### Markers: replaced before reading

The Markdown reader would mangle a line like `\pagebreak`. So **before** the text reaches it, each marker line is replaced by a small block of raw HTML, padded with blank lines so the reader treats it as its own block (`<div class="md2ebook-pagebreak"></div>`). The reader passes raw HTML through untouched. These divs do their jobs through CSS:
- the page-break div has zero size and `break-before: page`, so the *next* thing starts a new page;
- the space div has `height: calc(font-size × line-height × N)`;
- the toc div is a **slot** (an empty placeholder) that is replaced later.

### The style block

`generateStyleBlock` returns one big string of CSS. It starts with a `:root` rule listing **variables** (like `--md2ebook-font-size: 13.33px`), one for each setting. Everything below uses `var(--name)` to read them. So the style rules never contain your numbers directly; changing a setting only changes the variable list at the top.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `applyPageBreakMarkers`

```js file=apps/Markdown-to-PDF/src/document/markers.js fn=applyPageBreakMarkers
```

**The Logic:**
- The patterns are defined above the function. `^[ \t]*\\pagebreak[ \t]*$` means: from the **start of a line** (`^`), any spaces or tabs, the literal text `\pagebreak` (the backslash is doubled because a backslash is special in a pattern), any spaces or tabs, to the **end of the line** (`$`). The flags `g` (all matches) and `m` (`^` and `$` work per line) complete it. `\space\{[ \t]*(\d+)[ \t]*\}` captures the digits `(\d+)` as group 1.
- `.replace(pattern, text)` swaps every match. For the space marker, the replacement is a function that receives the captured digits `n`: `parseInt(n, 10) || 1` reads the number (and uses 1 if that fails), `Math.max(1, …)` and `Math.min(200, …)` force it into the range 1 to 200.
- The chained `.replace().replace().replace()` applies the three swaps one after another.

**Worked example.**
| Input | Output |
|---|---|
| `\pagebreak` | a blank line, `<div class="md2ebook-pagebreak"></div>`, a blank line |
| `\space{3}` | `<div class="md2ebook-space" data-lines="3" style="--md2ebook-space-lines: 3;"></div>` |
| `\space{500}` | the same with `3` replaced by **200** (the cap) |
| `\space{0}` | `data-lines="1"` (zero becomes 1) |
| `  \pagebreak  ` | a page break (outer spaces allowed) |
| `text \pagebreak` | unchanged: not alone on its line |

A gap of `\space{3}` at the defaults is `13.33 × 1.6 × 3 =` **64 px** tall (about 0.67 in).

### The variable list at the top of `generateStyleBlock`

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js
export function generateStyleBlock(normalized, paper) {
  var vars = [
    '--md2ebook-font-family: ' + normalized.fontStack + ';',
    '--md2ebook-heading-font-family: ' + normalized.headingFontStack + ';',
    '--md2ebook-text-align: ' + normalized.textAlign + ';',
    '--md2ebook-h1-text-align: ' + normalized.h1TextAlign + ';',
    '--md2ebook-h2-text-align: ' + normalized.h2TextAlign + ';',
    '--md2ebook-h3-text-align: ' + normalized.h3TextAlign + ';',
    '--md2ebook-font-size: ' + normalized.fontSize + 'px;',
    '--md2ebook-line-height: ' + normalized.lineHeight + ';',
    '--md2ebook-paragraph-spacing: ' + normalized.paragraphSpacing + ';',
    '--md2ebook-h1-size: ' + normalized.h1Size + 'px;',
    '--md2ebook-h1-weight: ' + normalized.h1Weight + ';',
    '--md2ebook-h2-size: ' + normalized.h2Size + 'px;',
    '--md2ebook-h2-weight: ' + normalized.h2Weight + ';',
    '--md2ebook-h3-size: ' + normalized.h3Size + 'px;',
    '--md2ebook-h3-weight: ' + normalized.h3Weight + ';',
    '--md2ebook-h1-line-height: ' + normalized.h1LineHeight + ';',
    '--md2ebook-h2-line-height: ' + normalized.h2LineHeight + ';',
    '--md2ebook-h3-line-height: ' + normalized.h3LineHeight + ';',
    '--md2ebook-base-weight: ' + normalized.baseWeight + ';',
    '--md2ebook-bold-weight: ' + normalized.boldWeight + ';',
    '--md2ebook-page-width: ' + paper.widthIn + 'in;',
    '--md2ebook-page-height: ' + paper.heightIn + 'in;',
    '--md2ebook-page-margin-vertical: ' + normalized.marginVerticalIn + 'in;',
    '--md2ebook-page-margin-horizontal: ' + normalized.marginHorizontalIn + 'in;',
  ].join('\n      ');

  return (
    '\n    :root {\n      ' +
    vars +
    '\n    }\n\n' +
    "    * { box-sizing: border-box; }\n\n" +
```

**The Logic:** `var vars = [ … ].join('\n      ')` builds a list of lines of CSS (each `--name: value;`) and glues them with a newline and indent. The values come from the normalised settings, with units added: `fontSize + 'px'`, `paper.widthIn + 'in'`. Then the function returns one long string made by joining pieces with `+`: `':root {' + vars + '}'` and, below that, every rule for paragraphs, headings, code, tables, the contents list, the markers and the print rules.

**Worked example.** With the defaults on A5: `--md2ebook-font-size: 13.33px;`, `--md2ebook-line-height: 1.6;`, `--md2ebook-paragraph-spacing: 16px;`, `--md2ebook-page-width: 5.83in;`, `--md2ebook-page-margin-vertical: 0.75in;`. The body font on the page is `var(--md2ebook-font-family)`, which holds the font stack (`Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`).

### The rules for the markers

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js
    '    .md2ebook-space {\n' +
    '      display: block;\n' +
    '      height: calc(var(--md2ebook-font-size) * var(--md2ebook-line-height) * var(--md2ebook-space-lines, 1));\n' +
    '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
    '      padding: 0;\n' +
    '      border: 0;\n' +
    '      page-break-inside: avoid;\n' +
    '      break-inside: avoid;\n' +
    '    }\n\n' +
    '    .md2ebook-pagebreak {\n' +
    '      height: 0;\n' +
    '      margin: 0;\n' +
    '      padding: 0;\n' +
    '      border: 0;\n' +
    '      page-break-before: always;\n' +
    '      break-before: page;\n' +
    '    }\n\n' +
```

**The Logic:** `.md2ebook-space` is a block as tall as `font-size × line-height × --md2ebook-space-lines`, `calc(…)` being CSS arithmetic, and it must not be split across pages (`break-inside: avoid`). `.md2ebook-pagebreak` has no height, margin, padding or border, and `break-before: page` makes the following content start a new page. (The CSS also states the older `page-break-before` name for browsers that only know that.)

**Worked example.** A5 page, 13.33 px font, line height 1.6: one line is 21.33 px; `\space{5}` is **106.6 px**; an A5 page with 0.75 in margins has `(8.27 − 1.5) × 96 =` 650 px of height, so about 30 lines.

## Intro

The **Table of Contents** section decides **what the contents list looks like**: which headings it includes, its title, how each level is styled, and whether it shows page numbers and dotted leaders. (How the list is *made* is on [Table of contents generation](md2pdf/building/toc-generation).)

## How to use

1. Type `\toc` on a line by itself (or Insert → **Table of contents** in the editor) where you want the list.
2. In **Typography → Table of Contents**:
   - **Include Headings:** H1 only, H1 to H2, or H1 to H3.
   - **Show title** and its **Title** text (default "Contents", styled like H2) and **Title Alignment** (link button: follow H2).
   - For each included level: **B**, **I**, **U** toggles, plus a **size (px)** and **line height**; blank means "match the body text". Defaults: level 1 bold, others plain.
   - **Show page numbers**, **Dotted line to page number**, **Start a new page after the contents**.
3. Entries are **links**: in the PDF, clicking one jumps to the heading.

## How it works

All the style settings become CSS rules for classes `md2ebook-toc-l1`, `…-l2`, `…-l3`. Each entry is a flex row of three parts: the **text**, a stretchy **leader** (the dotted line that fills the space) and the **page number**, aligned right. Level 2 is indented 1.4 em and level 3 2.8 em. Entries never split across pages.

Page numbers are not known when the list is written, since the pages are only decided after layout. The preview measures which page each heading lands on and passes that map to the export ([Table of contents generation](md2pdf/building/toc-generation)).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Checking the inputs

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js
    tocLevels: Math.min(3, Math.max(1, Math.round(toNumber(config.tocLevels, DEFAULTS.tocLevels)) || 3)),
    tocShowTitle: toBoolean(config.tocShowTitle, DEFAULTS.tocShowTitle),
    tocTitle: isBlank(config.tocTitle) ? String(DEFAULTS.tocTitle || 'Contents') : String(config.tocTitle).trim(),
    tocTitleAlign: toTextAlign(config.tocTitleAlign, toTextAlign(DEFAULTS.tocTitleAlign, '')),
    tocLevelStyles: [1, 2, 3].map(function (n) {
      var k = 'tocL' + n;
      return {
        bold: toBoolean(config[k + 'Bold'], DEFAULTS[k + 'Bold']),
        italic: toBoolean(config[k + 'Italic'], DEFAULTS[k + 'Italic']),
        underline: toBoolean(config[k + 'Underline'], DEFAULTS[k + 'Underline']),
        size: toPositiveNumber(config[k + 'Size'], toPositiveNumber(DEFAULTS[k + 'Size'], null)),
        lineHeight: toPositiveNumber(config[k + 'LineHeight'], toPositiveNumber(DEFAULTS[k + 'LineHeight'], null)),
      };
    }),
    tocPageNumbers: toBoolean(config.tocPageNumbers, DEFAULTS.tocPageNumbers),
    tocDotLeaders: toBoolean(config.tocDotLeaders, DEFAULTS.tocDotLeaders),
    tocPageBreakAfter: toBoolean(config.tocPageBreakAfter, DEFAULTS.tocPageBreakAfter),
```

**The Logic:**
- `tocLevels`: read the number, `Math.round` it, force at least 1 and at most 3. `|| 3` handles `NaN`.
- `tocLevelStyles` makes a list of three records with `[1, 2, 3].map(...)`, a loop that builds one value per entry. For level `n`, `k` is `'tocL' + n`, so `config[k + 'Bold']` reads `tocL1Bold`, `tocL2Bold`, and so on. A blank size or line height becomes `null` ("use the body's").
- The rest are yes/no switches through `toBoolean`.

**Worked example.** `tocLevels` of `"2"` → 2; `"7"` → 3; `"0"` → 1; `""` → 3 (default). Level 2 with size `"11"` and line height blank → `{ bold: false, italic: false, underline: false, size: 11, lineHeight: null }`.

### The per-level CSS

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js
    normalized.tocLevelStyles
      .map(function (st, i) {
        var sel = '    .md2ebook-toc li.md2ebook-toc-l' + (i + 1);
        return (
          sel + ' {' +
          ' font-weight: ' + (st.bold ? 'var(--md2ebook-bold-weight)' : 'var(--md2ebook-base-weight)') + ';' +
          ' font-style: ' + (st.italic ? 'italic' : 'normal') + ';' +
          (st.size ? ' font-size: ' + st.size + 'px;' : '') +
          (st.lineHeight ? ' line-height: ' + st.lineHeight + ';' : '') +
          ' }\n' +
          (st.underline ? sel + ' .md2ebook-toc-text { text-decoration: underline; text-underline-offset: 0.15em; }\n' : '')
        );
      })
      .join('') +
```

**The Logic:** the three style records are turned into three CSS rules. `i + 1` is the level number (the list starts counting at 0). `cond ? a : b` picks bold weight or regular weight. `(st.size ? "…" : "")` adds the size only if set, since `null` counts as false. `.join('')` glues the three pieces into one string.

**Worked example.** Level 1 `{ bold: true, size: 15, underline: true }` gives `.md2ebook-toc li.md2ebook-toc-l1 { font-weight: var(--md2ebook-bold-weight); font-style: normal; font-size: 15px; }` and a second rule underlining the text part (the dots and number stay not underlined).

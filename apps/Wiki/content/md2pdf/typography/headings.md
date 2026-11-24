## Intro

The **H1, H2 and H3** sections set how headings look: size, weight, spacing, an optional **line beneath** and alignment. **H4 to H6** have no sections: they follow H3's settings (H4 is H3's size × 0.9).

## How to use

Each level (collapsed until you open it) has:
- **Size (px)** and **Weight** (600 to 900). Defaults: H1 28 px weight 700; H2 22 px weight 600; H3 18 px weight 600.
- **Line Height** (defaults H1 1.25, H2 1.3, H3 1.35) and **Line beneath H1/H2/H3** (a thin grey rule under the heading; on for H1 only by default).
- **Alignment**: left, centre, right or justify, or the **link** button to follow the body text's alignment.
- The heading **font** is set in [Typeface](md2pdf/typography/typeface).
- Headings are never left alone at the bottom of a page: they always stay with the paragraph that follows (`break-after: avoid`).

## How it works

Each level has its own set of CSS variables (size, weight, alignment, line height), and a small function adds or removes the rule beneath: either `border-bottom: 2px solid #e2e8f0` with a little padding, or none.

**Alignment inheritance.** A blank level alignment means "like the body". So the code resolves alignment in layers: the level's own value if valid; else the saved default for that level; else the old single `headingTextAlign` setting from older settings files; else the body alignment.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Alignment layers: `toTextAlign`

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js fn=toTextAlign,toBoolean
```

**The Logic:** `toTextAlign` lower-cases the text (`Justify` works) and accepts it only if it is in the list `left, center, right, justify`. `toBoolean` makes sure the text `"false"`, `"0"`, `"no"` or `"off"` really means false (the plain JavaScript rule would call any non-empty text true).

### Resolving the layers

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js
  var textAlign = toTextAlign(config.textAlign, toTextAlign(DEFAULTS.textAlign, 'left'));
  // Older config files had one shared `headingTextAlign`; honour it
  // as the fallback for any heading level left blank.
  var legacyHeadingAlign = toTextAlign(config.headingTextAlign, textAlign);

  return {
    fontFamily: fontFamilyRaw,
    fontStack: fontStackFor(fontFamilyRaw),
    headingFontFamily: headingFontFamily,
    headingFontStack: fontStackFor(headingFontFamily),
    paperSize: paperKey,

    textAlign: textAlign,
    h1TextAlign: toTextAlign(config.h1TextAlign, toTextAlign(DEFAULTS.h1TextAlign, legacyHeadingAlign)),
    h2TextAlign: toTextAlign(config.h2TextAlign, toTextAlign(DEFAULTS.h2TextAlign, legacyHeadingAlign)),
    h3TextAlign: toTextAlign(config.h3TextAlign, toTextAlign(DEFAULTS.h3TextAlign, legacyHeadingAlign)),
```

**The Logic:** `textAlign` is the body's. `legacyHeadingAlign` is the old shared setting, itself falling back to the body. Each level calls `toTextAlign` on its own value; if that is blank, on the default for the level; if that is blank, on the legacy value.

**Worked example.** Body `justify`, H1 set to `Center`, H2 blank, no legacy value: H1 = `center`, H2 = `justify` (follows the body), H3 = `justify`. An older settings file with `headingTextAlign: "right"` and nothing per-level: all three levels = `right`.

### The rule beneath: `headingRule`

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js fn=headingRule
```

**The Logic:** it returns one of two blocks of CSS text, picked by the true/false argument: either the rule with `padding-bottom: 0.3em` of room above it, or `border-bottom: none` with no padding, so a heading without a rule leaves no gap.

### The heading styles in the page CSS

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js
    '    .page h1 {\n' +
    '      font-size: var(--md2ebook-h1-size);\n' +
    '      font-weight: var(--md2ebook-h1-weight);\n' +
    '      text-align: var(--md2ebook-h1-text-align);\n' +
    '      line-height: var(--md2ebook-h1-line-height);\n' +
    headingRule(normalized.h1Underline) +
    '    }\n\n' +
```

**The Logic:** the page's stylesheet is built as text, piece by piece with `+`. The `\n` at the end of each piece is a **newline** character so the CSS is readable. Each rule reads that level's variables; `headingRule(...)` adds the border lines or not.

**Worked example.** At the defaults, an H1 line is `28 × 1.25 =` **35 px** tall and an H2 is `22 × 1.3 =` **28.6 px**; an H1 with the rule has `0.3 em = 8.4 px` of padding above its line (0.3 × 28).

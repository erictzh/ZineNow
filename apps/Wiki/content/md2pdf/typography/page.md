## Intro

The **Page** section of the Typography tab sets the **paper size** and the **margins** (the empty border between the paper's edge and your text). Everything else, how many words fit on a line and how many lines on a page, follows from these.

## How to use

- **Paper Size:** A4, A5 (the default, a typical zine page), US Letter, or 11" × 17" (Tabloid). The preview re-flows at once.
- **Margin, Vertical (in)** is the top and bottom margin; **Margin, Horizontal (in)** the left and right. Defaults: 0.75 in each. The step buttons move by 0.125 in.
- You may also type a unit: `20mm`, `2cm` or `54pt` (a **point**, 1/72 inch) as well as bare inches. A blank, zero or unreadable box falls back to the default.
- Pages can also be switched from the preview's own paper control.

## How it works

Every Typography box holds **text**, even number boxes (it is what the user typed, or what a loaded settings file said). Before anything is drawn, one function (`normalizeConfig`) turns this raw text into a clean, **typed** set of values, replacing blank or nonsense with defaults. All the other code then trusts those values. This one place is "the single source of truth for blank → default".

The paper is a small table of sizes in inches; the chosen size and margins go into the CSS as variables, and into an `@page` rule, the CSS statement that tells the printer the sheet size and margin.

| Paper | Width × height (in) |
|---|---|
| A4 | 8.27 × 11.69 |
| A5 (default) | 5.83 × 8.27 |
| US Letter | 8.5 × 11 |
| Tabloid | 11 × 17 |

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Paper sizes

```js file=apps/Markdown-to-PDF/src/settings/defaults.js
export var PAPER_SIZES = {
  a4: {
    key: 'a4',
    label: 'A4 (8.27" x 11.69")',
    widthIn: 8.27,
    heightIn: 11.69,
    jsPdfFormat: 'a4',
  },
  a5: {
    key: 'a5',
    label: 'A5 (5.83" x 8.27")',
    widthIn: 5.83,
    heightIn: 8.27,
    jsPdfFormat: 'a5',
  },
  letter: {
    key: 'letter',
    label: 'US Letter (8.5" x 11")',
    widthIn: 8.5,
    heightIn: 11,
    jsPdfFormat: 'letter',
  },
  tabloid: {
    key: 'tabloid',
    label: '11" x 17" (Tabloid)',
    widthIn: 11,
    heightIn: 17,
    jsPdfFormat: 'tabloid',
  },
};

export var DEFAULT_PAPER_KEY = 'a5';
```

**The Logic:** a plain object (a table of named entries), each with a key, a label for the menu and the size in inches. `DEFAULT_PAPER_KEY` is `'a5'`. The `jsPdfFormat` field is only documentation: the print export uses the inches directly.

### Margins: `toMarginInches`

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js fn=isBlank,toMarginInches
```

**The Logic:** `isBlank` is true for nothing, `null`, or text with only spaces. `toMarginInches`: blank gives the default. `parseFloat` reads the leading number of the text (`"20mm"` gives 20; text with no number gives `NaN`, "not a number", caught by `Number.isFinite`). The ending decides the conversion to inches: **mm ÷ 25.4**, **cm ÷ 2.54**, **pt ÷ 72** (an inch is 25.4 mm, 2.54 cm or 72 points). No unit means inches, accepted only if above zero.

**Worked example.**
| Typed | Result (in) | Why |
|---|---|---|
| (blank) | 0.75 | default |
| `1` | 1 | bare number = inches |
| `20mm` | **0.7874** | 20 ÷ 25.4 |
| `2cm` | 0.7874 | 2 ÷ 2.54 |
| `36pt` | 0.5 | 36 ÷ 72 |
| `0` | 0.75 | not above zero, so default |
| `abc` | 0.75 | `parseFloat` gives `NaN` |

On A5 (5.83 in wide) with 0.75 in margins, the text column is `5.83 − 2 × 0.75 =` **4.33 in** wide and `8.27 − 2 × 0.75 =` **6.77 in** tall.

### Where it lands: `buildPageBoxRule` (the `@page` rule)

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js fn=buildPageBoxRule
```

**The Logic:** it writes `@page { size: 5.83in 8.27in; margin: 0.75in 0.75in; … }`, the standard CSS way of saying "the paper is this big, keep this much empty at the edge". The first margin value is top and bottom, the second left and right. The rest makes the preview look like separate sheets (white page, a 24 px gap, a dark seam). Page numbers are added into the same rule ([Page numbers](md2pdf/typography/page-numbers)).

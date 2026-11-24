## Intro

**Body Text** controls the look of ordinary paragraphs: how big, how tightly spaced, how aligned, how far apart, and how heavy the letters are.

## How to use

- **Body Font Size (px):** default 13.33 px (which is 10 pt, a common size for a printed zine). **Line Spacing:** the space between lines as a multiple of the font size, default 1.6.
- **Text Alignment:** left, centre, right, or **justify** (both edges straight). Code blocks and tables always stay left-aligned.
- **Paragraph Spacing (px):** the gap after each paragraph, default 16 px. (Old settings files saved this in `rem` or `em`; it is shown in px, and 1 rem = 16 px.)
- **Base Font Weight (Regular):** 300 Light, 400 Regular, 500 Medium. **Bold Text Weight (Strong):** 600, 700, 800 or 900, used for `**bold**` text.
- A blank or invalid box falls back to the default.

## How it works

Each box becomes a CSS **variable** (like `--md2ebook-font-size`) in the document's style block, and the page's rules use them: paragraphs, lists, tables and code blocks all use the paragraph spacing as their bottom margin; line spacing is the page's `line-height`. Changing one box changes one variable, and the whole document follows.

Some boxes **round off nonsense**: a negative line spacing or `abc` size is replaced by the default (`toPositiveNumber`), a bold weight is snapped to the nearest weight the font family offers (`toBoldWeight`), and a paragraph gap accepts a number (read as px) or a CSS length with a unit.

**Words are never hyphenated**: the stylesheet turns hyphenation off for paragraphs and lists (no "criti-/cal"); justified text just spreads the gaps between whole words. Paragraphs also keep at least 3 lines together at the top or bottom of a page (`orphans` and `widows`, the old printing names for a single stranded first or last line).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Reading numbers: `toNumber`, `toPositiveNumber`, `toCssLength`

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js fn=toNumber,toPositiveNumber,toCssLength
```

**The Logic:**
- `toNumber`: blank gives the fallback; a real number is used as is; text goes through `parseFloat` (reads the number at the start, ignoring letters after it); `Number.isFinite` rejects `NaN` ("not a number") and infinity.
- `toPositiveNumber`: also rejects zero and negatives.
- `toCssLength` accepts a **bare number** (adds the unit given, for example `px`), or a number plus one of `px rem em in cm mm pt %`. The patterns are **regular expressions**: `^-?\d*\.?\d+$` means "optional minus, optional digits, optional dot, at least one digit". Anything else gives the fallback.

**Worked example.**
| Call | Result |
|---|---|
| `toPositiveNumber("", 13.33)` | 13.33 |
| `toPositiveNumber("abc", 13.33)` | 13.33 |
| `toPositiveNumber("-2", 1.6)` | 1.6 (negative) |
| `toPositiveNumber("14.5", 13.33)` | 14.5 |
| paragraph spacing `""` | `"16px"` |
| paragraph spacing `"1.5"` | `"1.5px"` (bare number takes the `px` unit) |
| paragraph spacing `"1.5rem"` | `"1.5rem"` |
| paragraph spacing `"junk"` | `"16px"` |

With the defaults, one line is `13.33 × 1.6 =` **21.33 px** tall, and a paragraph is followed by 16 px: about three-quarters of a line.

### Bold weight: `toBoldWeight`

```js file=apps/Markdown-to-PDF/src/settings/normalizeConfig.js fn=toBoldWeight
```

**The Logic:** the allowed weights are 600, 700, 800, 900. If the value is one of them (`indexOf` returns −1 when not found), it is used. Otherwise the loop walks the list remembering the **closest** one: `Math.abs(n − w)` is the distance, and `diff < closestDiff` is strict, so on a tie the **earlier** (lighter) one wins.

**Worked example.** `500` → 600 (nearest). `650` → distances to 600 and 700 are both 50; the tie goes to **600**. `860` → distance to 800 is 60, to 900 is 40 → **900**. `700` is already allowed → 700.

### Showing old values in px: `paragraphPx`

```js file=apps/Markdown-to-PDF/src/ui/typography/BodyTextSection.jsx fn=paragraphPx
```

**The Logic:** the saved value is trimmed and matched against the pattern *number, then optionally px, rem or em*. `m[1]` is the number and `m[2]` the unit. For `rem` or `em` it multiplies by 16 and `toFixed(2)` rounds to two decimals; `Number(...)` then drops needless zeros. No match gives an empty box.

**Worked example.** `"16"` → `16`; `"1rem"` → `16`; `"0.75em"` → `12`; `"1.25rem"` → `20`; `"abc"` → empty.

### The variables in the page's CSS

```js file=apps/Markdown-to-PDF/src/document/styleBlock.js
    '    .page p {\n' +
    '      margin: 0 0 var(--md2ebook-paragraph-spacing) 0;\n' +
    '      orphans: 3;\n' +
    '      widows: 3;\n' +
    '    }\n\n' +
    '    .page strong, .page b {\n' +
    '      font-weight: var(--md2ebook-bold-weight);\n' +
    '    }\n\n' +
```

**The Logic:** `margin: 0 0 X 0` means top, right, bottom, left: only the bottom has the gap. `var(--name)` reads the variable written into the top of the style block ([Markers and the style block](md2pdf/building/markers-style-block)), so every setting lives in one place.

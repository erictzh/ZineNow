## Intro

**Character** settings change how each letter looks (font, size, weight, colour, spacing between letters and lines). **Paragraph** settings change how a block of lines behaves (alignment, indents, space between paragraphs). In ZEditor these are the first sections of the Text panel, and all of them are turned into one small object, the **look**, that both the editor and the PDF export read.

## How to use

**Text/Character**: **Font** (searchable list), **Size** in points, **B / I / U**, **Horizontal Align** (left, centre, right, justify), **Vertical Align** (top, middle, bottom: only in a box with a fixed height), **Color** (swatches or any colour) and **Fill opacity**.
- **Fill** (its own section under Text/Character): **Solid color** (the Color above) or **Gradient**, which fades from that color to a **To color** across the whole text box, with its opacity, angle and where it starts and ends. (It used to be the Gradient effect further down; it is the same setting, now next to the colour.)

**Spacing & layout:**
- **Line spacing (%)**, 80–300, default 130: the line height as a percentage of the font size.
- **Leading (pt)**: the exact distance from one baseline to the next, in points. Any value above 0 **replaces** the percentage.
- **Tracking (% of font size)**, −10 to 100: extra space after every letter.
- **Kerning:** *Font kerning (default)* or *Off*.
- **Letter case**, **Direction** (stacked), **Shrink to fit height** and **Strike-through** (none, line, double, wavy).

**Paragraph:** **First-line indent** (0–144 pt), **Left indent** and **Right indent** (0–288 pt), **Space before** and **after paragraph** (0–144 pt). A paragraph is everything between two new lines (Enter).

## How it works

### Words from the print world

- **Leading** (said "ledding") is the distance between baselines. It is named after the strips of lead that printers put between lines of metal type.
- **Tracking** adds the same space between every pair of letters, to loosen or tighten a whole text. **Kerning** adjusts *specific pairs* (like "AV" or "To") that look too far apart with a plain gap; the adjustments are stored inside the font file and the browser applies them when it is on.
- **Baseline** is the invisible line that most letters sit on. **Ascent** is how far the font reaches above it, **descent** below it.

### One "look" for everyone

`textLook` reads a box's stored settings once and works out everything drawing code needs: the line height as a **ratio** to the font size, tracking in pixels, the paragraph numbers converted from points to editor pixels, the default composer, and so on. The live box and the export both call it, so they cannot disagree.

### Line height and the baseline

Browsers centre each line's text inside its line box. The extra room (line height minus the font's own height) is split in two, the **half-leading**, above and below. The first baseline therefore sits `halfLeading + ascent` below the line's top. Browsers round the font's metrics, so ZEditor mirrors their rounding to put every letter at exactly the same pixel on a canvas as in the browser's own text.

### Indents and paragraph spacing

Every line has an available width: the width of the column minus the left indent, minus the right indent, minus the first-line indent **on a paragraph's first line only**. Paragraph spacing is added once between two paragraphs: the first one's *space after* plus the next one's *space before*.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `textLook`

```js file=apps/ZEditor/src/model/text/textLook.js fn=textLook
```

**The Logic:**
- `ann` is the text item (an **object** of stored settings). `ann.fontSize || 16` means "use 16 if there is none".
- `controlValues(ann, [LETTER_SPACING_CONTROL])` reads a setting using that control's default when it has not been set. Each *control* is a small description (name, range, default) shared by the panel and this code.
- `lineHeight`: if `ann.leadingPt > 0`, the ratio is `ptToPx(leading) / fontSize`; otherwise it is the percentage divided by 100. `cond ? a : b` picks one.
- `letterSpacingPx = fontSize × spacing / 100`: tracking is a percentage of the font size, so it scales with the text.
- `paragraph` converts every point value to pixels with `ptToPx`. `composer` picks the line breaker: an explicit choice wins, otherwise "paragraph" for justified or hyphenated text and "single" for the rest. `columns` is forced to a whole number between 1 and 6: `Math.max(1, Math.min(6, Math.round(...)))`, which **clamps** it.
- `padX: 4 + (label ? label.labelPadding : 0)`: the box's inner padding grows when a Label effect is on, so the bar sits around the text.

**Worked example.** Font size 12.1 px (11 pt).
- **Line spacing 130%:** `lineHeight = 130 / 100 = 1.3`, so each line is `12.1 × 1.3 = 15.73` px tall.
- **Leading 14 pt:** `ptToPx(14) = 15.4` px, so `lineHeight = 15.4 / 12.1 = 1.273` (the percentage is ignored).
- **Tracking 5%:** `letterSpacingPx = 12.1 × 5 / 100 = 0.605` px after every letter; a 10-letter word grows by 6 px.
- **Indent 12 pt:** `ptToPx(12) = 13.2` px.

### Baseline placement (inside `layoutText`)

`layoutText` is long (it also does wrapping, columns and curves), so these are the lines that place the baseline:

```js file=apps/ZEditor/src/render/textLayout.js
  const lineHeight = fontSize * look.lineHeight;
  // Blink also floors the half-leading (in editor px) before placing the baseline.
  const halfLeading = Math.floor(((ann.fontSize || 16) * look.lineHeight - (ascent + descent) / scaleFactor) / 2);
  const baselineOffset = halfLeading * scaleFactor + ascent;
```

**The Logic:** `lineHeight` is the line's height in canvas pixels (`fontSize` there is already multiplied by the scale). The **half-leading** is half the room left in the line after the font's own height (`ascent + descent`) is subtracted. `Math.floor` rounds down, because Blink (the browser engine of Chrome and Edge) does the same. The **baseline offset** is that half-leading plus the ascent: the distance from the line's top to the baseline.

**Worked example.** Font size 16, line spacing 130% (so `lineHeight` 20.8), and the browser reports ascent 15 and descent 4 (rounded to whole pixels, so the font box is 19).
- `halfLeading = floor((20.8 − 19) / 2) = floor(0.9) = 0`, so `baselineOffset = 0 + 15 = 15`.
- With 200% line spacing: `lineHeight = 32`, `halfLeading = floor((32 − 19) / 2) = floor(6.5) = 6`, `baselineOffset = 6 + 15 = 21`: the text sits lower inside its taller line, with 6 px above and (32 − 19 − 6 =) 7 px below.

### Indents and the width of each line (inside `composeText`)

```js file=apps/ZEditor/src/render/composer.js
    const startsAt = (first) => indentLeft + (first ? indentFirst : 0);
    const slot = opts.slotFor ? (lineIndex) => opts.slotFor(paraIndex, lineIndex) : null;
    const availAt = (lineIndex) => Math.max(1, (slot ? slot(lineIndex).width : opts.width) - startsAt(opensPara && lineIndex === 0) - indentRight);
```

**The Logic:** `startsAt(first)` is where a line's text begins: the left indent, plus the first-line indent if it is the paragraph's first line. `availAt(lineIndex)` is how wide line number `lineIndex` may be: its slot width (the column width, or less where a picture wraps) minus where it starts, minus the right indent; `Math.max(1, …)` guarantees it is never zero or negative.

**Worked example.** Column width 300 px, first-line indent 12 pt (13.2 px), left indent 0, right indent 0. Line 0 of a paragraph: `avail = 300 − 13.2 = 286.8`. Lines 1, 2…: `300 − 0 = 300`. With a left indent of 24 pt (26.4 px) and a right indent of 12 pt (13.2 px): the first line starts at `26.4 + 13.2 = 39.6` and has `300 − 39.6 − 13.2 = 247.2` px; the others start at 26.4 and have `300 − 26.4 − 13.2 = 260.4`.

### The paragraph gap (inside `layoutText`)

```js file=apps/ZEditor/src/render/textLayout.js
    const paraGap = px(para.spaceBefore + para.spaceAfter);
    // Where each line would sit in one long column (a paragraph's space before/after goes between paragraphs).
    const gapBefore = typesetLines.map((l, i) => (i > 0 && l.first ? paraGap : 0));
```

**The Logic:** the gap between two paragraphs is `spaceBefore + spaceAfter` (a simplification: both numbers belong to every paragraph, so each gap adds them once). `gapBefore` is a list with one number per line: the gap for the first line of every paragraph except the very first line of the box (`i > 0 && l.first`), and 0 for the others. **Worked example.** Space before 6 pt and after 6 pt: `px(12) = 13.2` px between paragraphs; a box of two paragraphs of 3 lines each at 15.73 px has height `6 × 15.73 + 13.2 = 107.6` px.

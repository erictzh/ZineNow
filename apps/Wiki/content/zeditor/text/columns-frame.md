## Intro

A **frame** is a text box with a fixed size, and **columns** split it into side-by-side strips that text flows through one after another, like a newspaper. Text that does not fit in the last column is hidden, and a red **+** warns you. Without a fixed height, the columns are **balanced** to be about the same length.

## How to use

In the Text panel, **Columns & frame**:
- **Columns:** 1 to 6.
- **Column gap (pt):** 0–72, default 12.
- **Frame height (pt):** 0 means "as tall as the text needs". A number makes a frame of exactly that height. You can also drag the top or bottom handle of the box.
- **Column rule:** *None* or *Line between columns*, with **Rule weight** (shown in tenths of a point: 5 is 0.5 pt).
- **Vertical Align** (in Text/Character) puts the text at the top, middle or bottom of a frame.
- If text is cut off, the box shows a red **+** in its corner. Click it to continue the story in a new, linked frame (see [Threads](zeditor/text/threads)).

## How it works

### Column width

The box's inner width (its width minus the padding on both sides) is divided among the columns and the gaps between them: `columnWidth = (innerWidth − gap × (columns − 1)) / columns`. The composer then sets the text one column wide.

### Flowing into columns

The composer sets the whole text as one long column. Then the code **cuts** that tall column into pieces of height `H`: each line goes in the current column until the next one would not fit, then a new column starts (`place`). The lines of column 2 are moved up to the top and across (`top = seqTop − starts[col]`, `x += col × (columnWidth + gap)`). Lines that would fall past the last column get `hidden = true`, which is how overflow is detected.

### Balancing: binary search on the height

With several columns and no fixed height, which `H` should be used? The best answer is the **smallest** height at which all the text still fits in the available columns. The code finds it by **binary search**: `lo` is one line, `hi` is the whole text in one column. It repeatedly tests the middle: if the text fits in at most `columns` columns at that height, the answer is at most `mid` (`hi = mid`), otherwise more (`lo = mid`). Twenty-four rounds, or until `hi − lo` is below half a pixel.

### The column rule

The vertical line sits in the middle of each gap: at `x + padX + i × stride + columnWidth + gap / 2`, where `stride = columnWidth + gap`.

### Vertical alignment

For a frame with a set height, after the lines are placed the code measures how far the lowest line of each column is from the frame's bottom, and shifts the column's lines down by that space times 0 (top), 0.5 (middle) or 1 (bottom).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The column width (inside `layoutText`)

```js file=apps/ZEditor/src/render/textLayout.js
  const innerWidth = Math.max(4, boxWidth - padX * 2);
  // Columns split the width; the composer sets text one column wide.
  const columns = typeset ? para.columns : 1;
  const columnGap = px(para.columnGap);
  const columnWidth = Math.max(4, (innerWidth - columnGap * (columns - 1)) / columns);
```

**The Logic:** `innerWidth` is the box width minus both paddings (never below 4 px). `columnGap` converts points to pixels. The last line is the formula above: subtract the total width of all gaps (`gap × (columns − 1)`, because three columns have two gaps) and divide the rest by the number of columns. `Math.max(4, …)` protects against a negative width.

**Worked example.** A box 400 px wide with `padX = 5` (4 padding + 1 border): `innerWidth = 400 − 10 = 390`. Two columns with a 12 pt gap (13.2 px): `columnWidth = (390 − 13.2 × 1) / 2 = 188.4` px. Three columns: `(390 − 13.2 × 2) / 3 = 121.2`.

### `place`: which column does each line go in?

```js file=apps/ZEditor/src/render/textLayout.js fn=place#2
```

**The Logic:** `place(H)` answers "if columns are `H` tall, which column is each line in, and where does each column start?".
- `starts` holds, for each column, the vertical position (in the long column) where it begins; it starts as `[0]`.
- For each line `i`, `colStart` is the start of the current (last) column. If this line's bottom (`seqTop[i] + lh[i]`) would be more than `H` below that start (`+ 0.01` for rounding), a new column starts at this line's top, less the paragraph gap before it (so a paragraph gap is not kept at the top of a column). `colOf.push(starts.length - 1)` records the line's column number.
- It returns both lists. The number of columns used is `starts.length`.

### The balancing search

```js file=apps/ZEditor/src/render/textLayout.js
      let H = frameInner;
      if (!H) {
        // Balanced: the shortest column height that still fits every line in the columns available.
        let lo = lineHeight, hi = Math.max(lineHeight, y + (lh.length ? lh[lh.length - 1] : lineHeight));
        for (let k = 0; k < 24 && hi - lo > 0.5; k++) {
          const mid = (lo + hi) / 2;
          if (place(mid).starts.length <= columns) hi = mid; else lo = mid;
        }
        H = hi;
      }
```

**The Logic:** `H` starts as the frame's fixed inner height; if there is none (`!H`, which is true for 0), balance. `lo = lineHeight` is the smallest sensible height, `hi` is the height of everything in one column. Each round tests `mid`: if the text then needs no more columns than are available (`place(mid).starts.length <= columns`), `mid` is good enough, so a smaller one might also work (`hi = mid`); otherwise it is too short (`lo = mid`). When the loop ends, `hi` is the smallest height found that fits.

**Worked example.** 15 lines of 20 px each, 2 columns. Then `lo = 20`, `hi = 300`.

| round | `mid` | lines per column | columns needed | fits in 2? | then |
|---|---|---|---|---|---|
| 1 | 160 | 8 | 2 | yes | `hi = 160` |
| 2 | 90 | 4 | 4 | no | `lo = 90` |
| 3 | 125 | 6 | 3 | no | `lo = 125` |
| 4 | 142.5 | 7 | 3 | no | `lo = 142.5` |
| 5–9 | 151 … 159.7 | 7 | 3 | no | `lo` creeps up |
| end | | | | | `hi − lo < 0.5`, **`H = 160`** |

`H = 160` is 8 lines, so the columns hold 8 and 7 lines: balanced. (It never goes below 8 lines because 7 lines would need three columns.)

### Putting lines in columns

```js file=apps/ZEditor/src/render/textLayout.js
        if (c >= columns) { l.hidden = true; overflow = true; l.top = H; l.x += (columns - 1) * (columnWidth + columnGap); return; }
        l.top = seqTop[i] - starts[c];
        l.x += c * (columnWidth + columnGap);
```

**The Logic:** `c` is the line's column. If it is past the last real column, the line is **hidden** and `overflow` is set (this is what shows the red +). Otherwise its `top` is its place in the long column minus where its own column started, and its `x` moves right by `c` column-strides (a column plus its gap).

**Worked example.** The 10th line (index 9, `seqTop = 180`) lies in column 1 (the second), which started at `starts[1] = 160`: `top = 180 − 160 = 20`: the second line of column 2. With `columnWidth = 188.4` and `gap = 13.2`: `x += 1 × 201.6`.

### `columnRules`

```js file=apps/ZEditor/src/render/textRuns.js fn=columnRules
```

**The Logic:** it returns an empty list unless the rule is on, the layout has lines, and there is more than one column. `scale` converts editor pixels to canvas pixels. The weight is stored in **tenths of a point** (5 means 0.5 pt) because the panel's sliders step in whole numbers: `ptToPx(weight / 10)`, with a minimum of 0.25. `y0` and `y1` are the text area's top and bottom. The loop creates `columns − 1` rules, one per gap, each at the gap's centre.

**Worked example.** Box left edge at `x = 100`, `padX = 5`, `columnWidth = 188.4`, `gap = 13.2`: the one rule is at `100 + 5 + 0 + 188.4 + 13.2 / 2 = 300`, exactly the middle of the 400 px box. A weight of 5 is `0.5 pt × 1.1 = 0.55` px wide.

### Vertical alignment

```js file=apps/ZEditor/src/render/textLayout.js
    const vAlign = ann.verticalAlign === "center" ? 0.5 : ann.verticalAlign === "bottom" ? 1 : 0;
    if (vAlign && frameInnerPx && !wrap) {
      const bottoms = new Map();
      typesetLines.forEach((l) => { if (!l.hidden) bottoms.set(l.col || 0, Math.max(bottoms.get(l.col || 0) || 0, l.top + (l.height || lineHeight))); });
      typesetLines.forEach((l) => { if (!l.hidden) l.top += Math.max(0, textHeight - bottoms.get(l.col || 0)) * vAlign; });
    }
```

**The Logic:** `vAlign` is the fraction of the spare room to push the text down: 0 for top, 0.5 for centre, 1 for bottom. `bottoms` is a `Map` from column number to the lowest point of its text (a running maximum, `Math.max`). Every visible line then moves down by `(frame height − its column's bottom) × vAlign`, never up (`Math.max(0, …)`). **Worked example.** A frame 200 px tall whose column text ends at 120 px: free room 80 px; centre moves every line down 40 px, bottom 80 px.

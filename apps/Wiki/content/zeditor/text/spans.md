## Intro

A **span** restyles just some letters of a text box: a coloured word, one bold phrase, a bigger first letter, or one centred paragraph in a left-aligned box, while the rest keeps the box's own settings. In the Text panel this is **Custom Text Style (span)**.

## How to use

1. **Double-click** a text box to edit it, then **select** some letters.
2. In *Custom Text Style (span)*, change the **Font**, **Size** (pt; press Enter), **B / I / U**, **strike-through** or **Color** (swatches or custom). Only the selected letters change.
3. For **Paragraph align**, put the caret (or a selection) anywhere in the paragraphs you want: alignment belongs to whole paragraphs.
4. **Reset selection** returns the selected letters to the box's own settings; **Reset all** removes every span.
5. The panel counts how many letters are customised.

## How it works

### Plain text plus a list of runs

A text box stores its words as one plain string. The restyled stretches are kept separately as a list of **runs**: `{ start, end, ...props }`, where `start` and `end` are character positions (`end` not included) and the props are any of: colour, font family, size, bold, italic, underline, strike, align. Where a run has no value for a property, the box's own setting shows. Runs are kept **sorted** and **never overlapping**. (The list is called `colorRuns` in the code because it began with colours only; old projects still open.)

### Changing a range

`setRunProps(runs, start, end, patch)` is the heart. For each existing run it checks how it overlaps the range: the part before, the part inside (patched) and the part after (kept as it was) become separate runs; gaps inside the range with no run get a new one. A `null` value in the patch **removes** that property. A final **normalise** step drops empty runs and **merges** neighbours with identical props.

### Staying right while you type

When text is typed or deleted, every run after the edit must move. `adjustRunsForEdit` finds what changed by comparing the old and new text: the **common start** (letters that match from the left) and the **common end** (from the right); what is left in the middle is the edit. Runs before it stay, runs after it **shift by the length change**, runs inside shrink, and text typed at the end of (or inside) a styled stretch **takes its style**.

### The selection outlives the focus

When you click a button in the panel, the text box loses focus and the browser forgets the selection. So the selection is saved in a plain shared object (`textSelectionStore`) as it changes, and the panel's buttons are made not to take focus (`onMouseDown={keepFocus}`, which calls `preventDefault`).

### Layout spans

Colour, underline and strike only change how a letter is *painted*. Font, size, bold, italic and align change the *shapes and widths*, so the whole box must be re-composed: `hasLayoutSpans` tells the engine whether that is needed.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `normalizeRuns`

```js file=apps/ZEditor/src/model/text/colorRuns.js fn=normalizeRuns
```

**The Logic:** `runs || []` guards a missing list. `.filter(...)` keeps runs that cover at least one letter (`end > start`) and set at least one property (`hasProps`). `.sort((a, b) => a.start - b.start)` puts them in order. The loop then builds `merged`: if the previous run ends exactly where this one starts **and** has the same props (`sameProps`), it is extended (`last.end = run.end`); otherwise a copy is added (`{ ...run }`).

### `setRunProps`

```js file=apps/ZEditor/src/model/text/colorRuns.js fn=setRunProps
```

**The Logic:**
- `apply(run)` returns a copy of a run with the patch laid over: each `[key, value]` is set, or **deleted** when the value is `null`/`undefined`.
- `pos` marks how far into the range has been handled. For each existing run (sorted): one outside the range is kept untouched (`continue`). One that sticks out on the left is kept as a left piece (`end: start`), one that sticks out on the right as a right piece (`start: end`). The part inside the range, `[max(run.start, start), min(run.end, end)]`, is **patched**. Any gap between `pos` and a run's start becomes a new run with just the patch.
- After the loop, if the range is not fully covered (`pos < end`), the tail gets a new run. `normalizeRuns` tidies the result.

**Worked example.** Existing: `[{ start: 0, end: 5, color: "#f00" }]`. Make letters 3–8 bold: `setRunProps(runs, 3, 8, { bold: true })`.
1. The run `0–5` sticks out on the left: kept as `{0, 3, red}`.
2. Its inside part `3–5` is patched: `{3, 5, red, bold}`; `pos = 5`.
3. The range goes on to 8 with no run there: a new run `{5, 8, bold}`.
Result (real output): **`[{0,3,red}, {3,5,red,bold}, {5,8,bold}]`**. Clearing the colour of `0–5` with `{ color: null }` removes the only property, so the run is empty and disappears: **`[]`**.

### `adjustRunsForEdit`

```js file=apps/ZEditor/src/model/text/colorRuns.js fn=adjustRunsForEdit
```

**The Logic:**
- `start` counts how many characters are the same from the **left** in the old and new text. `tail` counts how many are the same from the **right** (not counting what `start` already covered, `maxTail`). So the edit is `[start, removedEnd)` in the old text, replaced by `insertedLength` characters.
- `delta` is how much the text got longer or shorter.
- `mapStart` / `mapEnd` give each run's new position: before the edit, unchanged; after it, shifted by `delta`; inside it, squeezed to the edit's start. A run that **starts** exactly at an insertion stays after it; one that **ends** there grows to take the new text in.

**Worked example 1.** The old text is `"Hello world!"`, new `"Hello, big world!"`, with a red run on "world" (`6–11`). The common start is "Hello" (5 letters) and the common end is " world!" (7 letters), so the edit is the 5 characters ", big" inserted at index 5. The run is after the edit, so it shifts by `delta = 5`: **`{11, 16}`**, still on "world" (real output).
**Worked example 2.** A bold run `0–5` on "Hello"; you type "!!" at its end: `"Hello world"` → `"Hello!! world"`. The edit is at index 5, where the run ends, so `mapEnd` lets the run grow: **`{0, 7}`**: the new "!!" is bold too.

### `colorSegments`

```js file=apps/ZEditor/src/model/text/colorRuns.js fn=colorSegments
```

**The Logic:** it cuts the text into stretches that each have one style. `position` is how far it has got. For each run: if there is unstyled text before it, that text becomes a segment with no span; then the run's own text becomes a segment carrying its colour and span. After the loop, any unstyled text at the end is added. `.filter((s) => s.text.length > 0)` drops empty pieces. **Worked example.** `colorSegments("Hello world", [{ start: 6, end: 11, color: "#f00" }])` gives **`[ "Hello " (no style), "world" (red) ]`**.

### `runAt` and `hasLayoutSpans`

```js file=apps/ZEditor/src/model/text/colorRuns.js fn=runAt,hasLayoutSpans
```

**The Logic:** `runAt` returns the run containing a character position (`index >= run.start && index < run.end`) or `null`. `hasLayoutSpans` is `true` when **some** run sets any of font, size, bold, italic or align (`some` asks "is the test true for at least one item?"). The two `&&` guard against a missing list.

### `setAlign` in the panel

```js file=apps/ZEditor/src/ui/panels/TextSpans.jsx fn=setAlign
```

**The Logic:** alignment applies to whole paragraphs, so the selection is widened: `from` is the start of the first paragraph (`lastIndexOf("\n", …) + 1`), `to` the end of the last (`indexOf("\n", …)`, or the text's length if there is none). The run is applied over `[from, max(to, from + 1)]` (at least one character, so an empty paragraph still gets one).

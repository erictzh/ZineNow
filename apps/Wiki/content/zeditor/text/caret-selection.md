## Intro

When you edit text, three things have to agree: where the **caret** (the blinking cursor) is drawn, which letters are **selected** (the highlight), and which letter a **click** hits. Because the composer places every word itself, ZEditor has its own code to turn between a **text position** (letter number 17) and a **screen position** (x = 83 px, line 2), in both directions.

## How to use

- **Click** in a text box that is being edited to put the caret there. **Drag** to select. **Double-click** a word to select it, **triple-click** a paragraph.
- **← →** move one letter, **↑ ↓** move a line (the caret keeps its horizontal place), **Home** and **End** go to the start or end of the line.
- **Shift** with these extends the selection.
- A selection is what the **Custom Text Style (span)** section styles: see [Spans](zeditor/text/spans).

## How it works

### Two coordinate systems

A text box stores its words as one string. The caret is stored as a **character index**: 0 is before the first letter, 5 is after the fifth. The layout engine has produced **lines**, each knowing which index range it covers (`start`, `end`) and where each word sits (`pieces`, each with an `x`). To draw a caret, the code finds the line that contains the index, then the piece that contains it, then measures the text from the piece's start to the index: that width is the caret's x. To hit-test a click, it does the reverse.

### Finding the line

`lineIndexAt` searches the lines for the one whose range holds the index. There are two subtle rules: a caret at the end of a wrapped line is shown at the start of the **next** line (the break swallowed one space), and a caret at the end of a paragraph stays on that paragraph's last line.

### Closest gap between letters

For a click, `indexAtX` tries every gap between letters on the line, `measure(prefix)` gives the x of each, and the gap whose x is closest to the click wins (the smallest `Math.abs(difference)`): you can click on the left or right half of a letter and get the nearer side.

### Up and down

Pressing ↓ should keep the caret in the same column. A short line in between would otherwise make it drift. So the code remembers the **goal x** at the first press and, for each vertical move, finds the index on the target line nearest that x.

### Words and paragraphs

A **word** is a run of letters, digits and combining marks (plus apostrophes, underscores and hyphens): the code walks left and right from the click while each character matches the word regular expression. A **paragraph** is bounded by newline characters.

### The selection highlight

`selectionRects` makes one rectangle per line the selection touches. A selection that continues past the end of a line also shows a small extra width (0.35 × the font size) to show that the line break is selected.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `lineIndexAt`

```js file=apps/ZEditor/src/render/textCaret.js fn=lineIndexAt,lastVisibleLine
```

**The Logic:** `layout.typesetLines` is the list of lines. The loop tests each: `index >= l.start` and either `index < l.end` (inside the line) or, for a paragraph's **last** line, `index <= l.end` (the caret may sit at its very end). If the matching line is **hidden** (text past the last column of a frame), the caret rests on the last visible line instead (`lastVisibleLine` counts backwards from the end). If nothing matches, the last visible line is used.

**Worked example.** The paragraph "The quick brown fox" broke into two lines: "The quick" (`start 0, end 10`: the end includes the swallowed space) and "brown fox" (`start 10, end 19`, `last`). Index 4 → line 0. Index 9 (just before the space) → line 0. Index 10 (after the space) → line **1**, the start of the next line. Index 19 (the very end) → line 1 because it is the last line (`index <= l.end`).

### `xOnLine` and `caretRect`

```js file=apps/ZEditor/src/render/textCaret.js fn=xOnLine,caretRect
```

**The Logic:**
- `lineX = layout.padX + tl.x` is the line's left edge inside the box (box padding plus the line's own indent or alignment offset).
- With no words (an empty line) the caret is at the line's start. Before the first word, it sits at that word's `x`.
- The loop finds the **piece** (word) containing the index: `index >= p.start && index <= p.end`. The caret's x is the piece's `x` plus `layout.measure(text up to the index)`: the real width of the letters before it. (A hyphenated piece ends with a "-" that is not part of the text, so it is removed first, `p.text.slice(0, -1)`.)
- If the index is in the **spaces between** two words, the caret is placed proportionally across the gap: `from + (to − from) × ((index − p.end) / (next.start − p.end))`, which matters for justified lines where the gap is stretched.
- `caretRect` returns the whole caret: `x`, `y` (box padding plus the line's top), `height` (the line's own height, which can be taller for a bigger span) and the line number.

**Worked example.** A line "Hello world" starting at `padX = 5`, with 10 px per character, and the pieces "Hello" (x = 0) and "world" (x = 60). Caret at index 3: inside "Hello", so `x = 5 + 0 + measure("Hel") = 5 + 30 = 35`. Caret at index 5 (just after "Hello"): still in "Hello" (`index <= p.end`): `5 + 50 = 55`. Caret at index 6 (before "world"): index 6 is the start of the next piece: `5 + 60 + 0 = 65`.

### `indexAtX`

```js file=apps/ZEditor/src/render/textCaret.js fn=indexAtX
```

**The Logic:** it does the reverse of `xOnLine`. A click left of the first word gives the line's first index. For a click inside a word's horizontal extent `[left, right]`, an inner loop tries each gap (`n = 0 … raw.length`): `left + measure(raw.slice(0, n))` is that gap's x, and `dist` its distance from the click. The smallest wins (`best`). A click in the space between two words gives `Math.round(p.end + f × (next.start − p.end))` where `f` is how far across the gap you clicked. Past the last word it returns the line's end.

**Worked example.** The word "Hello" starts at x = 55 on screen (10 px per letter). Click at x = 83: the gaps are at 55, 65, 75, 85, 95, 105. The closest to 83 is 85 (distance 2), which is the gap after 3 letters: index `start + 3`. Click at x = 79 instead: 75 is 4 away, 85 is 6 away, so the caret goes to 75 (index `start + 2`).

### `moveVertical`

```js file=apps/ZEditor/src/render/textCaret.js fn=moveVertical
```

**The Logic:** `direction` is −1 (up) or 1 (down). The target line is the current line plus the direction. Moving up from the first line goes to the very start (index 0); moving down from the last goes to the very end (`textLength`). Otherwise `indexAtX(layout, target, goalX)` finds the index on that line closest to the remembered horizontal position.

### `wordRangeAt` and `paragraphRangeAt`

```js file=apps/ZEditor/src/render/textCaret.js fn=wordRangeAt,paragraphRangeAt
```

**The Logic:**
- `wordRangeAt`: `isWord` tests a character against `/[\p{L}\p{N}\p{M}'’_-]/u` (any letter, digit or combining mark in any language, plus apostrophes, underscore and hyphen). `s` walks left and `e` walks right while characters are word characters. If you double-click a space or punctuation mark (`s === e`), that one character is selected.
- `paragraphRangeAt`: `text.lastIndexOf("\n", index - 1) + 1` finds the start (just after the previous newline, or 0 if there is none: `lastIndexOf` gives −1, plus 1 is 0). `text.indexOf("\n", index)` finds the end; −1 means "no more newlines", so the end is the text's length.

**Worked example.** `wordRangeAt("big-world map", 6)`: from 6 walking left over "g", "i", "b" and the hyphen "-" (all word characters) gives `s = 0`; walking right over "orld" stops at the space: `e = 9`. Result `[0, 9]`: "big-world" is one word. `paragraphRangeAt("one\ntwo three\nfour", 6)`: `lastIndexOf("\n", 5) = 3` so `s = 4`; `indexOf("\n", 6) = 13`. Result `[4, 13]`: "two three".

### `selectionRects`

```js file=apps/ZEditor/src/render/textCaret.js fn=selectionRects
```

**The Logic:** for each visible line, the part of the selection on it is `[a, b]` (the selection clipped to the line). `x0` and `x1` come from `xOnLine` for the two ends; the rectangle is `x0 … x1` wide and one line tall. `runsOn` is true when the selection continues beyond this line: then `x1` is widened by `fontSize × 0.35`, the small extra width that shows a selected line break. Lines the selection does not touch are skipped (`return` out of that round of `forEach`).

## Intro

The **Text tool** (**T**) puts words on the page. Everything about how those words are laid out, wrapped, sized and drawn is done by one piece of code, the **text layout engine**, which the live editor and the PDF export both use, so a text box looks the same on screen and in print.

## How to use

- Press **T** (or choose Text in the toolbar), then **click** on the page: a box appears that **fits its text** and starts a new line when it reaches 320 px. Or **drag** to draw a box of a set width (at least 40 px).
- You can type at once. **Double-click** a box (Move tool) to edit it later; **Esc** finishes editing and keeps the box selected.
- New boxes take the font, size, bold, italic, underline, colour and alignment last set for the Text tool (the *tool defaults*).
- **Letter case** (Spacing & layout): As typed, UPPERCASE, lowercase, Title Case or Small caps. **Direction: Stacked** puts every character on its own line, for spines and signs.
- **Shrink to fit height:** type a height and the font shrinks, never grows past its Size, until the text fits.
- The panel works in **points** (pt); the page is drawn at 1.1 pixels per point.

## How it works

### One engine for the screen and the export

A canvas has no automatic text wrapping, and the browser's own wrapping can differ from a PDF's. So ZEditor does the wrapping itself, in code that does not care whether it is drawing on screen or exporting. Anything that is not plain (justified, indented, hyphenated, in columns, with wrapped obstacles, or with mixed-style spans) is called **typeset** and goes to the paragraph **composer** ([Composer and hyphenation](zeditor/text/composer-hyphenation)); plain text uses a simple word wrapper.

### Measuring instead of guessing

To know where a line breaks, the engine needs each word's width. It asks the canvas (`ctx.measureText`), which measures with the real font, so every font, size and weight gives true widths. Mixed spans are measured piece by piece in their own fonts.

### Word wrapping, the plain way

The plain wrapper adds one word at a time to the current line and checks whether the line has become wider than the box. If it has, the line before that word is finished and the word starts the next line. This is called **greedy** wrapping: fill each line as full as it will go. A single word wider than the whole box is cut into pieces. East Asian text can break between any two characters, since it has no spaces.

### Shrink to fit: binary search

To find the largest font size whose text still fits a given height, the code does a **binary search**: guess the middle of the range, test it, throw away the half that cannot contain the answer, and repeat. Twelve rounds narrow it to within a quarter pixel. This is far faster than trying every size, because each guess halves the remaining range.

### Case, stacking and typeset detection

`caseText` and `stackText` change the text before layout. `usesTypeset` and `usesCanvasText` are small yes/no tests that decide which engine a box needs. Ransom, curve and stacked text lay out letters one by one and never go to the composer.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `handleAddText`: making a box

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleAddText
```

**The Logic:**
- `x`, `y` are where you clicked; `width` is only given when you dragged (otherwise it is `undefined`, which means "fit the text").
- `nextAnnIdRef.current++` takes the next free id (see [State hooks](zeditor/workspace/state-hooks)).
- `updateAnnotationsFor(selectedIdx, (anns) => [...anns, {...}], "ann:" + id)` adds the new box to the page's list: `[...anns, newItem]` is the old list with one more item at the end (the top of the stack), built as a **new** array. The last argument is the **coalesce key** that merges "create the box" and "type the first letters" into one undo step.
- Each look setting is copied from `toolDefaults`, so the new box starts with the Text tool's current font, size and so on. `text: ""` makes it empty, ready for typing.
- The last three lines select the new box and switch it into editing, so you can type immediately.

### `wrapTextLines`: the plain wrapper

```js file=apps/ZEditor/src/render/textLayout.js fn=wrapTextLines
```

**The Logic:**
- `measure(s)` returns a string's width. `lines` collects the finished lines.
- `cutToFit` is a helper for a piece too wide for any line: it adds one character at a time to `chunk` and starts a new line whenever the next character would overflow. It returns the unfinished last chunk.
- The outer `for` loops over paragraphs (`text.split("\n")`); an empty paragraph becomes an empty line. For the others, the words are split on spaces and handled one by one. `wrapAtoms` splits a word into pieces where a break is allowed (every Chinese, Japanese or Korean character on its own; anything else stays whole).
- `joiner` is a space, except before a paragraph's first word or inside a CJK word. `test = current + joiner + atom` is the line if the piece were added. If it is too wide (`measure(test) > maxWidth`) and the line is not empty, the current line is **pushed** to `lines` and the piece starts a new one (cut to fit if it is wider than a whole line).
- If the line is empty and the piece alone is too wide, `cutToFit(test)` cuts it. Otherwise the piece simply joins the line.

**Worked example.** Assume 10 px per character, `maxWidth = 100`, text `"hello world foo"`.
1. `hello`: line is empty, `test = "hello"` = 50 px ≤ 100: `current = "hello"`.
2. `world`: `test = "hello world"` = 110 px > 100 and `current` is not empty: push `"hello"`; `current = "world"`.
3. `foo`: `test = "world foo"` = 90 px ≤ 100: `current = "world foo"`.
4. End of the paragraph: push `"world foo"`. Result: `["hello", "world foo"]`.

### `fitText`: shrink to fit by halving

```js file=apps/ZEditor/src/render/textLayout.js fn=fitText
```

**The Logic:**
- If there is no Fit Height or no text, the box is returned unchanged (an **early return**).
- `base` is the same box with Fit Height removed, so measuring does not recurse. If the text already fits at its Size, that is the answer.
- Otherwise `lo = 4` (the smallest allowed) and `hi` is the current size. The loop runs at most 12 times, or until the two are less than 0.25 apart. Each round, `mid` is the halfway point; `measureTextBox` returns the box's height at that size. If it fits, the answer is at least `mid` (`lo = mid`); if not, it is below `mid` (`hi = mid`).
- `Math.floor(lo * 4) / 4` rounds down to a quarter pixel, so the result is always a size that fits.

**Worked example.** Size 24, Fit Height 100. Say the text is about 6.5 times as tall as its font size (a made-up measuring rule, for illustration).

| Round | `lo` | `hi` | `mid` | height at `mid` | fits (≤ 100)? | then |
|---|---|---|---|---|---|---|
| 1 | 4 | 24 | 14 | 91 | yes | `lo = 14` |
| 2 | 14 | 24 | 19 | 123.5 | no | `hi = 19` |
| 3 | 14 | 19 | 16.5 | 107.3 | no | `hi = 16.5` |
| 4 | 14 | 16.5 | 15.25 | 99.1 | yes | `lo = 15.25` |
| 5 | 15.25 | 16.5 | 15.875 | 103.2 | no | `hi = 15.875` |
| … | | | | | | stops when `hi − lo ≤ 0.25` |

The final size is `Math.floor(15.25 × 4) / 4 = `**15.25**. Seven tries found it, instead of checking all 20 sizes.

### `caseText` and `stackText`

```js file=apps/ZEditor/src/model/text/textLook.js fn=caseText,stackText
```

**The Logic:**
- `caseText` returns the text changed by `.toUpperCase()` or `.toLowerCase()`. For Title Case it uses a **regular expression** (`/(^|[^\p{L}\p{N}'’])(\p{L})/gu`): "a letter that comes at the start of the text or after something that is not a letter, digit or apostrophe". `\p{L}` means "any letter in any language" (a Unicode property), and the `u` flag turns that on; `g` means "every match". For each match, the replacement function `(m, before, letter) => before + letter.toUpperCase()` keeps what came before and capitalises the letter.
- `stackText` puts each character on its own line: `Array.from(text)` splits into characters (correctly keeping emoji and other multi-part characters whole), `.map` replaces a newline by nothing, and `.join("\n")` glues them with newlines.

**Worked example.** `caseText("it's a ZINE-time (hello)", "title")` gives **`It's A ZINE-Time (Hello)`**: "it's" keeps its lower-case "s" (an apostrophe is not a word break), "ZINE" is unchanged (only the first letter of each word is touched), and the letters after "-" and "(" count as new words. `stackText("ZINE")` gives `"Z\nI\nN\nE"`: four lines.

### Which engine? `usesTypeset`

```js file=apps/ZEditor/src/model/text/textLook.js fn=usesTypeset
```

**The Logic:** `!(a || b || c)` is true only when **none** of ransom, curve or stacked is on (those have their own layout). `&& Boolean(...)` then asks whether *any* typeset feature is used (wrap obstacles, a thread, justify, hyphenation, columns, a frame height, any indent, paragraph spacing, the paragraph composer, or font-changing spans). `||` between many conditions means "at least one". If none apply, the cheap plain wrapper is used.

### Points and pixels

```js file=apps/ZEditor/src/model/text/textLook.js fn=ptToPx,pxToPt
```

**The Logic:** the page is drawn at `MAIN_SCALE = 1.1` pixels per point, so `ptToPx` multiplies by 1.1 and `pxToPt` divides. `(pt || 0)` treats a missing value as 0. **Worked example.** An 11 pt body size is `11 × 1.1 = 12.1` px (the built-in "P" style); a stored size of 24.2 px is shown as `24.2 / 1.1 = 22` pt (the built-in "H1").

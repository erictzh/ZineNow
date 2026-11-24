## Intro

The **Editor** tab is a plain text box for your **Markdown**, with a **formatting toolbar** above it. Markdown is text with light markers: `**bold**`, `# Heading`, `- list item`. The toolbar does the typing of those markers for you, and each button **toggles**: pressing Bold on bold text takes the bold off again.

## How to use

From left to right:
- **Text style** menu: Paragraph, Heading 1, 2 or 3 (Ctrl/⌘ + Alt + 0, 1, 2, 3). It shows what the line under the caret is (Quote, Bulleted list, Code block…).
- **B** bold (Ctrl/⌘ B), *I* italic (I), ~~S~~ strikethrough (Shift X), `<>` inline code (E).
- **{ }** code block (Shift E), with an arrow to pick the language ([Code language list](md2pdf/editor/code-languages)).
- **Link** (K): wraps the selection as `[text](url)` and selects `url` ready to type over.
- **Picture** button: inserts an image from a file ([Dropped pictures](md2pdf/editor/dropped-pictures)).
- **Bulleted list** (Shift 8), **numbered list** (Shift 7), **quote** (Shift 9).
- **Insert** menu: Table of contents (`\toc`), Page break (`\pagebreak`), Divider line (`---`), Code block, Code from file, Image from file, Image from web address, and **Blank space** with a number of lines (`\space{N}`, 1 to 200).
- On the right: **Save** (writes back to the file picked with Save As; a dot shows unsaved changes), **Save As…**, **Copy all** (the Markdown, not the HTML) and **Clear** (Ctrl/⌘ Z brings the text back).
- A grey strip above the text box reports what happened (saved, copied, errors).

## How it works

### Every action is a small "edit"

The formatting code (`editor/format.js`) never touches the text box. Each function takes **the text and the selection** and returns an **edit**, a description of one change: *replace the characters from `from` up to `to` with `insert`, then select `selStart` to `selEnd`*. This is easy to test (give text, get an edit), and one edit is applied as one step.

### Applied as if typed

An edit is then applied with the browser's own `execCommand("insertText")`, the old but still working command that behaves exactly like typing. Because the browser sees it as typing, **Ctrl+Z undoes it** as one step. (Setting the text from React would wipe the undo history, so that is only a fallback.)

### Toggling

- **Inline styles** look at the stars around the selection. Bold and italic share the `*` character, so it counts the run of stars: **2 or 3 means bold is on, 1 or 3 means italic is on** (`***both***`).
- **Block styles** (headings, quote, lists) are decided per line: if all selected lines already are that kind, they become paragraphs again; otherwise the old marker is stripped and the new one added.
- **Code blocks** are found by scanning the text line by line for a fence (three or more backticks or tildes) and its closing partner.

### The toolbar and the shortcuts

The toolbar only reports "button X pressed". `EditorTab.jsx` turns that into an edit and applies it. Shortcuts take the same path: `shortcutFor` turns a key press into the same `["inline", "bold"]`-style pair a button would send.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Finding the stars: `runBefore`, `runAfter`, `wrappedBy`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=runBefore,runAfter,wrappedBy
```

**The Logic:**
- `runBefore(text, pos, ch)` counts how many copies of one character sit **immediately to the left** of a position, by stepping back one character at a time while it still matches. `runAfter` does the same to the right.
- `wrappedBy(text, s, e, marker)` answers "is the part from `s` to `e` already wearing this marker?". For bold and italic it takes the **smaller** of the two star runs (left and right), because both sides must match. Then `n >= 2` means bold; `n % 2 === 1` (an odd number: 1 or 3) means italic. (`%` is the remainder after division: `3 % 2` is 1.) For `~~` and the backtick it simply compares the text just outside on both sides.

**Worked example.** In `a ***b*** c`, the selection is `b` (stars: 3 before, 3 after), so `n = 3`: bold is on (`3 >= 2`) and italic is on (`3 % 2 === 1`). In `**b**`, `n = 2`: bold on, italic off (`2 % 2 = 0`). In `*b*`, `n = 1`: italic only.

### `toggleInline`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=toggleInline
```

**The Logic:** four cases, in order.
1. **Nothing selected** (`start === end`): if the caret is already between an empty pair (`****`), remove the pair (step out); otherwise insert an empty pair and put the caret in the middle (`start + len`).
2. **Trim spaces.** The loops move `s` forward and `e` back over whitespace: `** bold **` is not bold in Markdown, so the markers must hug the words. If only spaces were selected, the edit changes nothing.
3. **Markers just outside** the selection (`wrappedBy`): remove them by replacing `[s − len, e + len)` with the plain text.
4. **Markers inside** the selection (you selected `**word**` itself): remove them from the text.
5. Otherwise: wrap with `m + inner + m` and select the inner text again (`s + len` to `e + len`), so pressing the button again unwraps it.

**Worked example.** Text `hello big world`, select `big` (positions 6 to 9), press Bold: edit = `{ from: 6, to: 9, insert: "**big**", selStart: 8, selEnd: 11 }`, giving `hello **big** world` with `big` still selected. Pressing Bold again: now `wrappedBy` is true, so edit = `{ from: 6, to: 13, insert: "big", selStart: 6, selEnd: 9 }`, back to the start. With only a caret in `x` at position 0, Bold gives `{ from: 0, to: 0, insert: "****", selStart: 2, selEnd: 2 }`: an empty pair with the caret between.

### `lineKind` and `setBlock`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=lineKind,setBlock
```

**The Logic:** `lineKind` uses **regular expressions** (patterns for text; `^` is the start of the line, `#{1,6}` is one to six hashes, `[ \t]+` is spaces or tabs) to name a line: `h1`…`h6`, `quote`, `ul`, `ol` or `p`.

`setBlock` finds the lines the selection touches: `from` is the start of the first line (the character after the previous newline, `lastIndexOf("\n", start − 1) + 1`) and `to` is the end of the last line. A selection that ends right at the start of a new line does not take that line along (`lastPos`). Then:
- `allAlready`: if every non-blank line already is the wanted kind, the target becomes `"p"` (undo toggle).
- `prefixFor()` makes the marker per line: `"#".repeat(2) + " "` for H2; `"> "` for a quote; `"- "` for a bullet; for a numbered list `++number + ". "`, which increases a counter first, so the lines are numbered 1, 2, 3.
- Each line is stripped of its old marker (`stripPrefix`) before the new one is added; blank lines are kept as they are, so the numbering skips them.
- With only a caret, it keeps the caret on the same character of the text, by adding the **change in prefix length**.

**Worked example.** Text `one⏎⏎two⏎three` (14 characters), everything selected, Numbered list: lines are `one`, ``, `two`, `three`; blank is left alone; result `1. one⏎⏎2. two⏎3. three`, with the whole result selected. Text `Title`, caret at 2, Heading 2: old prefix 0, new prefix 3 (`## `), caret = `0 + max(3, 2 − 0 + 3) = 5`. On `# Title` with the caret at 3, Heading 1: all lines already h1, so the target is paragraph: the result is `Title` with the caret at `max(0, 3 − 2 + 0) = 1`.

### Code blocks: `fencedBlocks` and `toggleCodeBlock`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=fencedBlocks,fenceFor,toggleCodeBlock
```

**The Logic:**
- `fencedBlocks` walks the text **line by line** (`indexOf("\n", pos)` finds each line's end). While not inside a block, a line matching `FENCE_OPEN_RE` (up to 3 spaces, then three or more backticks or tildes, then an optional language word) opens one. Inside a block, a line made only of the same fence character, at least as long as the opening, closes it. Each block remembers its line ranges, its language and its fence. An unclosed block runs to the end.
- `fenceFor(content)` finds the **longest run of backticks inside** the code, and uses a fence one longer (at least 3). Code that itself contains ``` is then still safe.
- `toggleCodeBlock`: if the caret is inside a block of the **same language**, the fences are removed (`insert` is just the inside); in a block of **another** language, only the word after the opening fence is changed; outside a block, the selected lines are wrapped (selection kept), or with nothing selected an empty block is inserted with the caret inside.

**Worked example.** Text `a⏎b⏎c` (5 characters), the first three characters selected (`a` and `b` lines), language `json`: the edit is `{ from: 0, to: 3, insert: "```json\na\nb\n```\n", … }`, so the two lines are wrapped. In ```` ```json⏎x⏎``` ```` with the caret on the `x` line, choosing json again removes the fences and leaves `x`; choosing python changes only the first line to ```` ```python ````. Code containing a run of three backticks gets a **four-backtick** fence: ```` ````js⏎a ``` b⏎c⏎```` ````.

### Inserting at the caret: `insertBlockLine`, `insertLink`, `clampSpaceLines`

```js file=apps/Markdown-to-PDF/src/editor/format.js fn=insertBlockLine,insertLink,clampSpaceLines
```

**The Logic:** `insertBlockLine` puts a line **on its own**, with a blank line before and after, but adds only the blank lines that are missing: it looks at the characters before and after (`endsWith("\n\n")` means there is already a blank line; `endsWith("\n")` means one more newline is needed; otherwise two). `insertLink` wraps the selection as `[label](url)` and selects `url`; with no selection it inserts `[link text](url)` and selects `link text`. `clampSpaceLines` reads the typed number with `parseInt`; anything that is not a number (`NaN`) is treated as 5 (`|| 5`), and the result is held between 1 and 200.

**Worked example.** `insertBlockLine("a⏎⏎b", 1, 1, "---")`: the text before is `a` (no newline) so the prefix is two newlines; the text after starts with `⏎⏎`, so no suffix: insert `⏎⏎---`. At position 2 of `a⏎b`: before ends with a newline (prefix one more), after is `b` (suffix two): `⏎---⏎⏎`. `clampSpaceLines("300")` → 200; `("abc")` → 5; `("0")` → 5 (because `0 || 5` is 5); `("1")` → 1. `insertLink("see here", 4, 8)` → `[here](url)` with `url` selected (positions 11 to 14).

### Keyboard shortcuts in the editor

```js file=apps/Markdown-to-PDF/src/ui/editor/EditorTab.jsx fn=shortcutFor
```

**The Logic:** it returns `null` (not ours) unless Ctrl or ⌘ is held, and ignores **AltGr** (on many keyboards AltGr is how the `@` or `{` are typed). With Alt, only the digits 0 to 3 mean block styles. They use `e.code` (the **physical key**, `Digit1`) instead of `e.key`, because with Alt held `e.key` may be a different character. Browsers keep Ctrl+digit for switching tabs, which is why headings use Ctrl+Alt+digit. With Shift: Shift X (strikethrough), Shift E (code block), Shift 7/8/9 (lists and quote). With nothing else: B, I, E, K.

**Worked example.** Ctrl+Alt+2 → `["block", "h2"]`; Ctrl+Shift+8 → `["block", "ul"]`; Ctrl+K → `["link"]`; Ctrl+Shift+E → `["codeBlock", null]` (`null` means "the language picked last"); plain `b` without Ctrl → `null`, so the key types a normal "b".

### Making the edit undoable

```js file=apps/Markdown-to-PDF/src/editor/applyToTextarea.js fn=applyToTextarea,replaceAllEdit
```

**The Logic:** it focuses the box and selects the range to change, then lets the browser do the change as typing (`insertText`, or `delete` when the new text is empty). If the browser lacks the command, the fallback sets the text through React (`flushSync` forces React to update the box *immediately*, so the selection that follows is not cut short by the old, shorter text). `replaceAllEdit` is the edit "replace everything with this text", used by Open file, Load sample and Clear.

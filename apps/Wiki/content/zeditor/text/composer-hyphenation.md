## Intro

The **composer** decides where each line of a paragraph ends and where every word sits on the line. **Hyphenation** decides where a long word may be split. Together they give text the even, professional look of a page-layout program, instead of the ragged, gappy look of a plain text box. Justified text, indents, columns, wrap and threads all rely on it.

## How to use

In the Text panel's **Paragraph** section:
- **Line breaking:** *Automatic* (the default), *Single-line (fast)* or *Paragraph (even spacing)*. Automatic uses the paragraph composer for justified or hyphenated text, and the fast one otherwise.
- **Hyphenation:** *Off* or *On (English)*. Words of at least five letters can be broken with a hyphen at the end of a line. Words in ALL CAPS stay whole.
- **Horizontal Align:** the fourth button justifies the text. **Last line** (visible when justified) sets how each paragraph's final line sits: left, centre, right, or justified too.

## How it works

### Boxes, glue and penalties

The composer first turns a paragraph into a list of three kinds of **tokens**, the vocabulary of Donald Knuth's TeX typesetting system:
- a **box** is a piece of a word, with a fixed width;
- **glue** is a space, which has a natural width but may **stretch** (up to 33%) or **shrink** (up to 20%);
- a **penalty** is a place where a line may break, with a cost: a hyphen costs 50, a break after a space costs nothing, a forced paragraph end is infinitely good.

Every layout feature (justify, indents, hyphenation) is just a different way of choosing break places among the same tokens.

### Two ways to choose the breaks

**Greedy** ("single-line"): fill the first line as full as possible, then the next, and so on. It is fast and easy to predict, but it can leave an ugly loose line after a tight one, because it never looks ahead.

**Knuth–Plass** ("paragraph"): considers **all** possible break sets for the whole paragraph at once and picks the one with the lowest total cost. It uses **dynamic programming**: it keeps a list of "active" best partial answers and extends them one break at a time, never re-solving the same sub-problem. For every candidate line it works out:
- the **adjustment ratio** `r = (L − w) / stretch` (or `/ shrink` when too long): how much the glue must stretch, as a fraction of its allowance. 0 means a perfect fit, 1 means stretched to the limit.
- the **badness** `100 × |r|³`: cubed, so a slightly loose line costs little but a very loose one costs enormously.
- the **demerits** `(10 + badness + penalty)²`: squared again, so one terrible line is worse than several mediocre ones. Two hyphenated lines in a row add 3000, and a tight line next to a loose one adds 3000, because both look bad.

It first tries with a tolerance of 2 (ratio at most 2), then 5, then 30, so it only accepts ugly lines when it has to. If no break set is acceptable it falls back to greedy.

### Justification

After the breaks are chosen, a justified line shares its leftover space equally over its spaces: `stretch = (avail − natural) / glueCount`. Each word is then placed at its natural position plus the shares of the spaces before it.

### Hyphenation: Liang's patterns

Where may "typography" break? Not by guessing: TeX uses **Liang's algorithm**, a table of several thousand short letter patterns, each with numbers that vote for or against a break between two letters (for example, the pattern for "ph" votes against breaking between the p and the h). ZEditor uses the standard US English pattern table from the `hyphen` package, bundled into the app. A break must leave at least 2 letters before and 3 after.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `wrapAtoms`: where a word may break

```js file=apps/ZEditor/src/render/composer.js fn=wrapAtoms
```

**The Logic:**
- A word is split into **atoms**, the smallest pieces a line may break between. `Array.from(word)` splits into real characters (an emoji stays one).
- `WRAP_CJK_RE.test(ch)` asks whether the character is Chinese, Japanese or Korean. Such a character is its own atom (it needs no space around it), and the text built so far (`run`) is closed first.
- Closing punctuation like "。" or "）" must never start a line, so it is **glued** onto the atom before it (`atoms[atoms.length - 1] += ch`). Any other character just extends `run`.

**Worked example.** `wrapAtoms("你好，world")` gives `["你", "好，", "world"]`: each character alone, but the comma attached to "好", and the Latin word kept whole.

### `tokenize`: text to boxes, glue and penalties

```js file=apps/ZEditor/src/render/composer.js fn=tokenize
```

**The Logic:**
- `items` is the token list. `pushBox` adds a box; if a piece alone is wider than any line could be, it is chopped into single characters with expensive (300) penalties between them, so it can still be broken as a last resort.
- The `while` loop walks the paragraph. A space becomes **glue**: width `spaceWidth`, `stretch = spaceWidth × 0.33`, `shrink = spaceWidth × 0.2`. Anything else is a word: `j` runs to the next space, `word = para.slice(i, j)`.
- For each atom, if hyphenation is on, the word's letters are separated from punctuation around it (`lead`, `trail`, using a **regular expression** `^[^\p{L}]*`, "any run of non-letters at the start"). The hyphenator splits only the letters, and the punctuation is re-attached to the first and last pieces ("(typography," stays "(ty" … "phy,").
- Between hyphenation pieces a **penalty** of cost 50 and width `hyphenWidth` is pushed, marked `flagged: true` (so two in a row can be punished).

**Worked example.** With 10 px per character, `"Hello big world"` becomes: box(50) glue(10) box(30) glue(10) box(50). With hyphenation, "typography" (100 px) becomes box("ty" 20) penalty(hyphen, 50) box("pog" 30) penalty box("ra" 20) penalty box("phy" 30).

### `isBreak`, `lineStartAfter`

```js file=apps/ZEditor/src/render/composer.js fn=isBreak,lineStartAfter
```

**The Logic:** `isBreak` says whether a line may end at token `i`: at **glue** only if the token before it is a box (no break after a break), or at a **penalty** unless its cost is "infinite" (never). `lineStartAfter` finds where the next line begins: it skips forward past glue and penalties to the first **box** (`while (k < items.length && items[k].type !== "box") k++`), so a line never starts with a space.

### `greedyBreaks`

```js file=apps/ZEditor/src/render/composer.js fn=greedyBreaks
```

**The Logic:**
- `width` is the natural width of the line so far; `lastFit` is the last place the line could have ended and still fit. `lineWidth(line)` is the width allowed for line number `line` (it can differ per line: indents, wrap).
- At each break opportunity, `total` is the width if the line ended here (including a hyphen's width for a penalty). If it **fits**, `lastFit` moves forward. If it does **not** fit and a `lastFit` exists, the line is ended there (`breakAt(lastFit)`) and the scan restarts from the next line's first box (`continue`). If nothing fits (one piece wider than the line), it breaks here anyway: the piece overflows alone.
- `EPS = 1e-6` is a tiny tolerance: decimal numbers like 0.1 + 0.2 are not exact in a computer, so "fits" needs a hair of slack.

**Worked example.** Width 160, 10 px per character, text `mmmm hhh iiii rrrrr eeeee jjjjj qqqq bb bb qqqq ffffff ffffff lll nnnnn`. Line 3 starts at "jjjjj": it adds words while they fit. "jjjjj qqqq bb bb" is exactly 160 wide: fits (slack 0), and the next word would not. Line 3 ends there. Then line 4 gets "qqqq ffffff" (110 wide) and cannot take another "ffffff" (would be 180): **50 px of slack on a line with only one space**.

### `optimalBreaks`: Knuth–Plass

```js file=apps/ZEditor/src/render/composer.js fn=optimalBreaks
```

**The Logic:**
- **Prefix sums.** `W`, `Y`, `Z` are running totals of width, stretch and shrink before each token (`W[i + 1] = W[i] + width`). With them, the natural width of any stretch of tokens is just `W[i] − W[start]`: one subtraction instead of adding up all the tokens, which keeps the algorithm fast.
- The outer `for (const tolerance of [2, 5, 30])` tries the strict setting first.
- `active` is the list of **active nodes**: possible previous break points, each with its line number, its fitness class, its total demerits so far and a pointer to the node before it (`prev`).
- For each break opportunity `i`, every active node `a` is tried as the start of the line ending at `i`. `w` is the line's natural width, `y` and `z` its total stretch and shrink. The **ratio** is `(L − w) / stretch` if the line is too short, `(L − w) / shrink` if too long, 0 if exact; a line needing more shrink than exists gets `−Infinity`.
- `if (ratio >= -1 && !forced) alive.push(a)`: a node stays alive only while lines from it can still fit (a ratio below −1 means even fully shrunk it is too long; it will never be a good start again).
- `if (ratio < -1 || ratio > tolerance) continue` rejects lines that are too tight or too loose. Otherwise `badness = 100 × |ratio|³`, and the **demerits** are `(10 + badness + penalty)²` (the `LINE_PENALTY` is 10). A negative penalty (a forced break) is subtracted instead. Two flagged (hyphenated) breaks in a row add 3000.
- `fit` is the **fitness class**: 0 very tight (ratio below −0.5), 1 normal, 2 loose (up to 1), 3 very loose. If it differs by more than one class from the previous line's, 3000 is added.
- `best` is a `Map` keyed by `line × 4 + fit`: for each (line number, fitness) only the cheapest way to get there is kept. This is the **dynamic programming** step: a worse path to the same state can never win later, so it is thrown away.
- At the paragraph's forced end the cheapest node is the answer. Following `prev` pointers backwards (`for (let node = final; node && node.index >= 0; node = node.prev)`) lists the breaks in reverse, and `.reverse()` puts them right. If no tolerance finds a solution, the function returns `null`.

**Worked example.** The same text, width 160, space stretch = 3.3 per space. Compare the last two lines of each solution:

| | line text | natural | slack | spaces | ratio = slack ÷ (3.3 × spaces) | badness 100 × `\|r\|³` | demerits (10 + badness)² |
|---|---|---|---|---|---|---|---|
| greedy 3 | jjjjj qqqq bb bb | 160 | 0 | 3 | 0 | 0 | 100 |
| greedy 4 | qqqq ffffff | 110 | 50 | 1 | 15.2 | 347,831 | 121 billion |
| KP 3 | jjjjj qqqq bb | 130 | 30 | 2 | 4.5 | 9,391 | 88 million |
| KP 4 | bb qqqq ffffff | 140 | 20 | 2 | 3.0 | 2,783 | 7.8 million |

Greedy filled line 3 perfectly and paid for it on line 4. Knuth–Plass moved one word ("bb") down, accepting a slightly loose line 3 to avoid a terrible line 4: about **1,250 times less** cost for the pair. Real text has longer words and a smaller ratio, but the principle is the same.

### `composeText`: justifying and placing words

`composeText` is about 130 lines, so the two parts that do the justification are shown here (the rest, in order: split the text into paragraphs, tokenize, find the breaks, and turn each break into a line object).

```js file=apps/ZEditor/src/render/composer.js
      let align = justify ? "left" : paraAlign;
      let stretch = 0;
      if (justify) {
        if (!isLast || lastLine === "all") { if (glueCount) stretch = (avail - natural) / glueCount; }
        else align = lastLine;
      }
…
        const spaces = p.gapBefore - gluesSeen;
        x += spaces * (spaceWidth + stretch);
        gluesSeen = p.gapBefore;
```

**The Logic:**
- A justified line is positioned with `align = "left"` plus a `stretch`. For every line except a paragraph's last (or all lines if "Justify all lines" is chosen), `stretch = (avail − natural) / glueCount`: the free room divided among the spaces. The last line instead takes the **Last line** setting (`align = lastLine`).
- Each word has `gapBefore`, the number of spaces before it on the line. The word's `x` grows by that many spaces' worth of `(spaceWidth + stretch)` each time, plus the width of the previous word. Several spaces in a row each get their own share.

**Worked example.** Line "The quick brown": natural width 150 (30 + 10 + 50 + 10 + 50), `avail = 160`, 2 spaces: `stretch = (160 − 150) / 2 = 5`. "The" at x = 0; "quick" at `0 + 30 + 1 × (10 + 5) = 45`; "brown" at `45 + 50 + 15 = 110`; it ends at `110 + 50 = 160`, exactly the line width. This is the real output of the code (x = 0, 45, 110).

### `englishHyphenator`

```js file=apps/ZEditor/src/render/hyphenation.js fn=englishHyphenator
```

**The Logic:** words shorter than 5 letters return `null` ("do not split"). A word equal to its own upper-case version (`word === word.toUpperCase()`) is an acronym or shouted word, so it stays whole; `word.length > 1` protects a single letter. `hyphenateSync` returns the word with invisible **soft hyphens** (character U+00AD) inserted at the allowed places, and `.split(SOFT_HYPHEN)` cuts the text at each one into pieces. If there is only one piece, no break exists, so it returns `null`.

**Worked example (real output).** `typography` → `["ty", "pog", "ra", "phy"]`; `hyphenation` → `["hy", "phen", "ation"]`; `typesetting` → `["type", "set", "ting"]`; `composer` → `["com", "pos", "er"]`; `ZINE` → `null` (all capitals); `print` → `null` (no break is allowed in it); `a` → `null` (too short).

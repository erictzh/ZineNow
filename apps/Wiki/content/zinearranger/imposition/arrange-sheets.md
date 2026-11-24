## Intro

This page follows the function that does the main job: from **your options and a page count**, work out **how many sheets there are and which page goes in every cell** of every sheet. It is written as a **pure function**: it only calculates, it does not touch the screen, so it is easy to test.

## How to use

You do not call it. It runs whenever you load a PDF or change an option. The result is shown as the sheets in the preview and the log reports *"Total zine layout: 16 page slot(s) across 2 sheet(s)."*

## How it works

1. **Pick the layout** by building a key from the options (`eighth/single/portrait/side`) and looking it up in the layout table ([Layouts](zinearranger/imposition/layouts)).
2. **Pad the page count** up to a whole number of sheets, then up to a whole number of signatures, so every sheet and signature is full.
3. **For each sheet** compute its anchors `s`, `e`, `m`, `n` (see [Signatures](zinearranger/imposition/signatures)).
4. **For each side of the sheet and each cell**, translate its text spec into a real **position**, a list of **tokens** (rotate, fold and cut markers) and a **slot number**.
5. Return the padded page count, whether the paper is portrait, and the list of sheets.

Then a thin wrapper (`arrangeZineSheets`) stores the padded count in the app's state, sets the print orientation, and writes the sheets into the page ([Sheet HTML](zinearranger/imposition/sheet-html)).

**The back-cover rule.** On a top-fold zine, the back cover can be shown upside down or the right way up. If **Flip Back Cover** is off, the sheet that holds the zine's very last page uses a different spec for that one cell (the layout's `backCover` entry).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `layoutKey` and `impose`

```js file=apps/ZineArranger/src/imposition/impose.js fn=layoutKey,impose
```

**The Logic:**
- `layoutKey` joins four words with `/`: the size name from the list `SIZE_KEYS` (`SIZE_KEYS[size]`), `single` or `double`, `portrait` or `landscape`, `side` or `top`; and adds `/copy` when the zine is quarter-size, double-sided and two-copies. (`cond ? a : b` means "if cond then a, otherwise b".)
- `impose` takes the options as one object and **unpacks** the ones it needs in its parameter list. It reads `pagesPerSheet` and `step` (`layout.step || pagesPerSheet / 2` means "the layout's value, or half the sheet").
- **Padding:** `pageCount % pagesPerSheet` is the **remainder** after division: pages left over. If not 0, add `pagesPerSheet − remainder` to reach the next multiple. Same for the signature.
- `layout.sides.forEach((cells, side) => …)`: every sheet produces one entry per **side**; the `id` is a unique number (`i × sides + side`), used in the page's HTML.
- `isBackCoverSheet`: flip is off and this sheet's last page `e` is the zine's last slot (`pageCount − 1`). The `.find(...)` looks for a replacement spec for this side and cell.

**Worked example (padding).** A one-sided eighth-size zine with 30 pages: `30 % 8 = 6`, so add `8 − 6 = 2` pages: **32 pages** and **4 sheets**. A half-size zine (4 per sheet) with 5 pages: `5 % 4 = 1`, add 3: **8 pages** and (two sides per sheet) 4 sheet sides. **Keys:** `layoutKey({ size: 2, doubleSided: false, zinePortrait: true, spineSide: true })` is `"eighth/single/portrait/side"`; quarter + double + copies: `"quarter/double/portrait/side/copy"`.

### `parseCell`

```js file=apps/ZineArranger/src/imposition/impose.js fn=parseCell
```

**The Logic:** it splits the text at spaces. The **first** word is the position and the **last** is the page expression; everything in between are tokens (`parts.slice(1, -1)` means "from the second to the second-last"). The page expression is checked by a **regular expression** (a pattern language for text): `^([semn])(?:([+-])(\d+))?(b?)$` means: one letter from `s e m n`, then optionally a sign and digits, then an optional `b`. A bad spec throws an error. The offset is `+number` or `−number`. The page is `anchors[letter] + offset`, and `copy` is `"b"` or `""`.

**Worked example.** With anchors `s = 0, e = 7`: `"tl r foldTop e-3"` → `{ pos: "tl", tokens: ["r", "foldTop"], page: 4, copy: "" }`; `"br foldLeft s"` → `{ pos: "br", tokens: ["foldLeft"], page: 0 }`; `"bl s+1b"` → page 1 with `copy: "b"` (the second copy). In a signature of 4 pages-per-sheet-8 with `s = 4`, `e = 11`: `e-3` is slot 8.

### `arrangeZineSheets`

```js file=apps/ZineArranger/src/imposition/arrangeZineSheets.js fn=arrangeZineSheets
```

**The Logic:** clear the old sheets, ask `impose` for the result, store the padded count back (`state.pageCount`), set the print orientation ([Print](zinearranger/print)), then write the HTML. The `state` object ([Options panel and display settings](zinearranger/options-display)) is the app's single bag of current values, so other parts read the updated count.

## Intro

A **signature** is a stack of sheets folded together into one booklet unit. A long zine is made of several signatures that are bound together. Why not fold everything as one stack? Because paper has thickness: a stack of 40 folded sheets would be too fat to staple, and its inner pages would stick out. So the arranger splits a long zine into several balanced signatures automatically.

## How to use

- By default the **sheets per signature** is chosen for you, with a cap of **25 sheets** (a typical stapler or binding machine limit).
- Tick **Custom Signature Size** in the Advanced tab, and type a number of sheets per signature. Your number is **always respected**, with no cap. The label shows how many zine pages that makes: *Sheets per signature (24 zine pages/signature)*.
- The page count is padded with blank pages to fill the last signature completely.

## How it works

### Nesting

In one signature, sheet 1 is the **outermost**: it holds the first and last pages of the signature. Sheet 2 sits inside it and holds the pages just inward, and so on. This is why each sheet's pages are numbered relative to its signature's start `s` and end `e` (see [Layouts](zinearranger/imposition/layouts)): for sheet *k* (counting from 0 within the signature):

`s = step × k + (signature number × pages per signature)`
`e = (signature number + 1) × pages per signature − step × k − 1`

`step` is how far each sheet moves inward: normally half the pages per sheet.

### How many sheets per signature?

If you gave a number, use it. Otherwise: if the whole zine is at most 25 sheets, **one signature**. If it is longer, find the smallest number of signatures that fits under the cap, and divide the sheets **evenly** among them, rounded up.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `resolveSheetsPerSig`

```js file=apps/ZineArranger/src/imposition/signatures.js fn=resolveSheetsPerSig
```

**The Logic:** `totalSheets` is the page count divided by the pages a sheet holds. (1) A chosen size (`state.sigSize > 0`) wins. (2) Otherwise, up to the cap, everything is one signature. (3) Otherwise `Math.ceil(totalSheets / 25)` is how many signatures are needed (`Math.ceil` rounds **up**), and `Math.ceil(totalSheets / numSignatures)` is the size of each, which is guaranteed not to exceed the cap and keeps them balanced.

**Worked example (8 pages per sheet).**
| Pages | Sheets | Result |
|---|---|---|
| 24 | 3 | 3 sheets in one signature |
| 200 | 25 | 25 (exactly the cap) |
| 208 | 26 | `ceil(26 / 25) = 2` signatures, each `ceil(26 / 2) =` **13** sheets |
| 480 | 60 | `ceil(60 / 25) = 3` signatures of **20** sheets |
| 480 with Custom Signature Size = 4 | 60 | **4** (no cap applies) |

### Where it is used: the nesting formula

```js file=apps/ZineArranger/src/imposition/impose.js fn=impose
```

**The Logic:** in the loop, `i` is the sheet number. `sigCount = Math.floor(i / sheetsPerSig)` is which signature, and `i % sheetsPerSig` (the remainder) is the sheet's position within it. `s` and `e` are computed as in the formula above, and `m`, `n` are the quarter-signature anchors. The cell specs are then converted with those anchors. ([Arranging sheets](zinearranger/imposition/arrange-sheets) explains the rest.)

**Worked example (checked by running the code).** A one-sided eighth-size zine of 16 pages has 2 sheets and (by default) one signature of 2 sheets, `step = 4`. Sheet 0: `s = 0`, `e = 15`; its cells hold slots `12, 3, 2, 1` (top row) and `13, 14, 15, 0` (bottom row). Sheet 1: `s = 4`, `e = 11`; it holds `8, 7, 6, 5` and `9, 10, 11, 4`. The outer sheet holds the zine's first and last pages (0 and 15); the inner one the middle.

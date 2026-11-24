## Intro

After the sheets have been worked out as plain data, they have to become something you can **see and print**. This small function turns the list of sheets into **HTML**: one `<section>` per sheet side, and inside it one `<section>` per cell holding an empty **canvas**, which is the surface the PDF page will be painted onto.

## How to use

The **guide** options (Advanced tab) change what the lines look like:
- **Margins:** a black frame around each sheet.
- **Center:** the cut lines become **solid**.
- **Folds:** fold lines (and the cuts, if the centre guide is off) become **dotted**.
- With none ticked, no lines are drawn.

## How it works

For each cell the function writes a section with CSS **classes**: its **grid position** (`tl`), and for each token a class: `r` becomes `rotate` (the stylesheet rotates it 180°); `cutX` becomes a solid or dotted border on side X; `foldX` a dotted border. Every cell contains `<canvas id="p4">`, where the number is the slot, so the loader ([Loading a PDF](zinearranger/load-pdf)) can find the right canvas with `document.getElementById("p" + slot)`. A second copy uses `p4b`.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `sheetsHtml`

```js file=apps/ZineArranger/src/imposition/sheetsHtml.js fn=sheetsHtml
```

**The Logic:**
- `SIDE_NAMES` maps `Left`, `Right`, `Top`, `Bottom` to the lower-case words used in the CSS class names.
- `tokenClass(token)` is defined inside `sheetsHtml` so it can see the guide options. `"r"` gives `" rotate"`. Otherwise `token.startsWith("cut")` decides whether it is a cut or a fold, and `token.slice(kind.length)` removes the first 3 or 4 letters (`cut` or `fold`) to leave the side name. A cut is **solid** with the centre guide, **dotted** with the fold guide, and **nothing** otherwise. A fold is dotted only if fold guides are on.
- The loops build one long **string** of HTML with `+=`. `cell.tokens.map(tokenClass).join("")` converts every token and glues the pieces together.
- The sheet's class includes the grid name (`eig-por`) and `" guide-margins"` if on.

**Worked example (checked by running the code).** The one-sided eighth-size zine, 8 pages, with Folds ticked. The first cell is `<section class="zine-page tl rotate guide-dotted-top"><canvas class="zine-canvas" id="p4"></canvas></section>` (position `tl`, rotated, a dotted line on its top edge, slot 4); the bottom-right cell is `<section class="zine-page br guide-dotted-left"><canvas … id="p0">…`. With the Folds guide off these would have no `guide-dotted-…` classes at all, only `zine-page tl rotate`.

### How the classes look

```css file=apps/ZineArranger/style.css
.rotate {
    transform: rotate(180deg);
}
```

```css file=apps/ZineArranger/style.css
.guide-dotted-top {
    border-top: 2px dotted black;
}
```

**The Logic:** `rotate(180deg)` turns the cell upside down. The guide classes draw a 2 px **dotted** or 3 px **solid** black border on one side of the cell, which is exactly the line where you fold or cut.

## Intro

**Page Numbers** prints a number on each page of the zine, automatically: in the corner, centred, with a style you choose, and only on the pages you pick. It is one document-wide setting, drawn on top of everything on the page.

## How to use

*Page menu → Page Numbers* (switch), then **Customize…**:
- **Start numbering on page** and **Stop after page** (empty means the last): which pages carry a number. They count positions in the document.
- **First page shows number:** the number the first numbered page gets. Use 5, for instance, if your zine continues another.
- **Position:** the four corners, centres top or bottom, or **Bottom / Top, outer corner**.
- **Style:** `1`, `– 1 –` or `Page 1`.
- **Size** (4–48 pt), **Distance from edge** (inches) and **Color**.

The number shows live on the page, and is printed by Export PDF, the image exports and Send to ZineArranger.

## How it works

### One function decides everything

`pageNumberSpec(settings, pageIdx, pageCount)` returns what to print on a page, or `null` for no number. The same function is used by the live preview, the PDF export and the image export, so they cannot disagree.

Its steps, for a page at position `p` (1-based):
1. Off, or `p` outside `from … last` (where `to = 0` means "the last page"): nothing.
2. The number is `first + (p − from)`: counting starts at the first *numbered* page.
3. The text comes from the style.
4. The position is resolved (see below), and split into a vertical part (`top` or `bottom`) and a horizontal one (`left`, `center`, `right`).

### "Outer corner" and the booklet rule

In a printed booklet, odd pages are on the right-hand side of a spread and even pages on the left. Numbers look best at the *outer* edges, away from the fold. So `bottom-outside` is rewritten as `bottom-right` for odd pages and `bottom-left` for even ones: `position % 2 === 1 ? "right" : "left"`.

### Placing it

On screen, the number is a text element at `marginIn × 72 × MAIN_SCALE` from the edges (inches to points to editor pixels), with the font size scaled the same way. Centre positions stretch the element over the full width and centre its text.

### Drawn last

On export the number is painted last, after the page, filter and items, so it is never hidden by a picture.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The defaults

```js file=apps/ZEditor/src/model/pageNumbers.js fn=DEFAULT_PAGE_NUMBERS
```

An **object** is a bundle of named values: `on`, `from`, `to` (0 means "to the last page"), `first`, `position`, `format`, `size`, `color`, `marginIn`. These are the starting values of the settings.

### `pageNumberSpec`: what goes on this page?

```js file=apps/ZEditor/src/model/pageNumbers.js fn=pageNumberSpec
```

Reading it:
- It returns `null` (nothing to print) in three cases: the setting is off, there is no page, or the page's position is outside the range. `pageIdx` counts from 0 but people count pages from 1, so `position = pageIdx + 1`.
- `last` is the last numbered page: the `to` setting, but never more than the page count (`Math.min`), or the final page if `to` is 0.
- `number = settings.first + (position - settings.from)`: the first numbered page shows `first`, the next one more, and so on.
- `text` is chosen by two nested ternaries: "– 5 –", "Page 5" or just "5". The backticks make a **template literal**.
- `place`: if it ends in `-outside`, replace the word with `right` for odd pages (`position % 2 === 1`, remainder 1 after dividing by 2) and `left` for even pages. That is the booklet rule.
- `place.split("-")` cuts "bottom-right" into `["bottom", "right"]`, and `const [vertical, horizontal] = ...` unpacks the pair. The function returns an object with everything a drawing routine needs.

### Where the live number is drawn

```js file=apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
      {numberSpec && (
        <div
          className="ze-page-number"
          style={{
            fontSize: numberSpec.size * MAIN_SCALE,
            color: numberSpec.color,
            [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
            ...(numberSpec.horizontal === "center"
              ? { left: 0, right: 0, textAlign: "center" }
              : { [numberSpec.horizontal]: numberSpec.marginIn * 72 * MAIN_SCALE }),
          }}
        >{numberSpec.text}</div>
      )}
```

Reading it: `{numberSpec && ...}` draws nothing when the value is `null`. `[numberSpec.vertical]: value` is a **computed property name**: if `vertical` is `"bottom"`, this means `bottom: value`, placing the text that far from the bottom edge. `marginIn * 72 * MAIN_SCALE` is inches converted to points, then to editor pixels. Centred numbers stretch from `left: 0` to `right: 0` and centre their text; others are placed at `left` or `right` the same distance in.

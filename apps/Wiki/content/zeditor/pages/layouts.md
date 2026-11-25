## Intro

**Layout** (Page menu) gives you **ready-made pages**, like the layouts in slide apps: grey boxes where pictures go, and text boxes already filled with lorem ipsum so you can see how real text will sit. There are 11: full text, picture above or below the text, picture left or right of the text, title and text, full picture, two columns, cover, picture and caption, and title with two columns. Everything a layout makes is an ordinary item (a rectangle and text boxes) that you can move, resize, restyle or delete.

## How to use

1. **Page → Layout → Choose…**
2. Pick where it goes at the top: **New page after** (the default) adds a new blank page after the current one holding the layout, or **On this page** applies it to the current page, **under** your own items. Picking another layout on the same page **replaces** the earlier one instead of stacking; the text area keeps its words and moves into the new layout's text area. Both are **one undo step**. The same picker is also the **Layout** button at the top of the page strip on the left.
3. Click a layout's little picture.
4. **Layout settings (this file)** (fold-out at the bottom): **Margin**, **Gap between pieces**, **Split** of the half-and-half layouts, **Body text size**, **Title size**, **Body line spacing**, **Caption size**, **Column gap**. **Reset to defaults** puts them back. These are saved **in the project file**, so a different document keeps the app's defaults.
- All layout text is **justified** (both edges straight); change it in the Format panel like any text.
- Layouts already on a page are not re-flowed when you change the settings: only layouts added afterwards use the new sizes.
- The **margin** is the Page Guide's margin when the Page Guide is on, otherwise 8% of the page width.
- Text uses the **Text tool's current font and colour**. The sizes come from the Layout settings: **body 11 pt with 150% line spacing**, **titles 25 pt, bold, with a thin line beneath them**, captions 0.85 times the body size.

## How it works

### One set of sizes

Every layout reads the **same settings object** (`DEFAULT_LAYOUT_SETTINGS`), so changing a default changes all of them. A saved or hand-edited settings object is made safe first (`normalizeLayoutSettings`): numbers are kept inside their range, junk is ignored.

### Slots and boxes

A layout is a list of **slots** with a role (picture, title, body, caption). `place()` turns them into boxes in editor pixels, working inside the **inner box** (the page minus its margin). A half-and-half layout cuts the box in two along one axis, leaving a **gap** between the pieces; the mirrored layouts just swap which role takes which side.

### Text that fits

A body box is filled with lorem ipsum, then cut where the frame ends, so it **fits exactly and shows no "overset" warning**: the text is laid out with the real text engine, cut at the first hidden line, then trimmed a word at a time if the cut text still overflowed.

### Adding it

Items are given new ids and placed **in front of the existing list** (the list is bottom layer first), so they sit beneath what is already there. A new page gets the layout inside its own item list.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The settings

```js file=apps/ZEditor/src/model/pageLayouts.js fn=normalizeLayoutSettings
```

**The Logic:** it starts from a copy of the defaults (`{ ...DEFAULT_LAYOUT_SETTINGS }`: the three dots copy every entry into a new object). For each editable field it reads the saved value with `Number(...)`; only a real number (`Number.isFinite`) is used, and `Math.min(max, Math.max(min, v))` **clamps** it between the field's minimum and maximum. The grey colour must look like `#rrggbb` (a **regular expression**: a pattern for text).

**Worked example.** `{ marginPct: 999, gapPct: "x", titlePt: 30, bogus: 1 }` becomes margin **30** (the maximum), gap **4** (the default, since `"x"` is not a number), title **30 pt**, and `bogus` is dropped.

### The room inside the margin

```js file=apps/ZEditor/src/model/pageLayouts.js fn=innerBox
```

**The Logic:** with the Page Guide on, the room is its margin rectangle: the trim box (the guide's paper format, centred on the page and never bigger than it) shrunk by the margin; otherwise it is `marginPct` of the page width on every side. If the guide's margin would leave no room, the percent margin is used.

**Worked example (A5, 419.76 × 595.44 pt, margin 8%).** `m = 33.58`: the room starts at (33.58, 33.58) and is **352.6 × 528.28**. With the Page Guide on, format A6 (105 mm = 297.6 pt wide) and a 0.5 in (36 pt) margin: the trim box is centred, so the room starts at `(419.76 − 297.6)/2 + 36 =` **97.1** and is `297.6 − 72 =` **225.6** wide.

### Placing the slots

```js file=apps/ZEditor/src/model/pageLayouts.js fn=place
```

**The Logic:** `gap = pageW × gapPct / 100`. A split layout takes the room's length along the axis, subtracts the gap (`usable`), gives the first piece `usable × splitPct / 100` and the second the rest, the second starting after the first and the gap. Stacked layouts (title, then body below) keep a `cursor`: where the next slot may start. A title is one line tall (`font × scale × 1.3`); a caption is two lines; a full picture uses the whole page instead of the inner box; the cover's title sits 62% of the way down.

**Worked example (A5, defaults).** Picture on top: `usable = 528.28 − 16.79 = 511.49`; picture height `255.75`; the text starts at `33.58 + 255.75 + 16.79 =` **306.12** with the same height. Picture left: widths `(352.6 − 16.79)/2 =` **167.9** each, the text starting at x = **218.27**. Title and text at 14 px body size: the title is `14 × 2.5 × 1.3 =` **46** px tall and the body starts `16.79` below it. (Checked by `tests/pageLayouts.test.js`.)

### Cutting the lorem ipsum to fit

```js file=apps/ZEditor/src/render/layoutItems.js fn=fitTextToFrame
```

**The Logic:** `layoutTextBox` lays the text out in its frame and returns the lines; a line with `hidden` set did not fit. The text is cut at the first hidden line's `start` (always the start of a line, so at a word) and trailing spaces are removed. A shorter text can break its last paragraph differently, so the loop checks `overflow` and drops one word at a time (`lastIndexOf(" ")` finds the last space) until nothing overflows, with a limit of 40 tries as a safety stop.

**Worked example.** A 120 pt wide frame 40 pt tall at 10 pt, given 200 words `w0 w1 …`: the cut text is a prefix of the 200 words, shorter than all of them, and `measureTextBox` reports no overflow. Text that already fits (`"just a few words"`) comes back unchanged.

### Making the items

```js file=apps/ZEditor/src/render/layoutItems.js fn=buildLayoutItems
```

**The Logic:** the body size in pixels comes from the text tool (`ptToPx(bodyPt)`), `place()` gives the boxes, and each box becomes an item. A picture slot is a plain **solid grey rectangle** (the rectangle defaults, with the fill set to `slotGrey`); a text box copies the text tool's font, size and colour. Every item is tagged `layoutRole` (picture, title, body, caption) so later features can find the body. Text frames get a fixed width in pixels and a frame height in **points** (`pxToPt`, since a frame's height is stored in points).

### Adding to a page, or as a new page

```js file=apps/ZEditor/src/state/useLayouts.js fn=useLayouts
```

**The Logic:** `addLayoutToPage` asks for the page's real display size, builds the items and calls `updateAnnotationsFor(selectedIdx, anns => [...made, ...anns])`: the new items go **first** in the list (bottom), then the existing ones, so nothing is covered. `addPageWithLayout` builds a blank page with the layout already in its items, records an undo checkpoint, inserts it after the selected page (`splice(at, 0, newPage)` inserts without deleting) and selects it. A blank page keeps the current blank page's size; otherwise the default.

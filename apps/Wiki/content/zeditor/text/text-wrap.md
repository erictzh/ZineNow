## Intro

**Text wrap** makes text flow **around** a picture or shape instead of running underneath it. Set it on the image or shape (the *obstacle*), and every text frame it overlaps sets its lines in the space left over, in the widest free stretch of each line.

## How to use

Select an **image or a rectangle/ellipse** and open its **Text wrap** section:
- **Text wrap:** *None*, *Around bounding box* or *Around object shape*.
- **Wrap offset (pt)**, 0–72, default 6: the breathing room between the object and the text.
- *Object shape* follows an image's visible (non-transparent) pixels, or an ellipse's outline. A cut-out sticker with a transparent background hugs its outline.
- It works on text boxes with a **set width** that are not rotated and do not use Ransom, Curve or Stacked text. Put the picture over or beside the text box and the lines move aside.

## How it works

### Obstacles as polygons

Every wrapping object is turned into one or more **polygons** (lists of corner points) in the text frame's own coordinates:
- *Bounding box:* the rectangle, rotated about its centre if the object is turned (the usual rotation formula).
- *Ellipse:* 48 points around the outline (`x = cx + cos t × rx`, `y = cy + sin t × ry`).
- *Image shape:* the image's **opaque rows**. The picture is read at up to 400 px across, cut into 96 horizontal bands, and for each band the leftmost and rightmost opaque pixel (alpha of at least 24 of 255) give a thin rectangle. Together the rectangles trace the outline.

### The free slot of a line

For a line at a given height, `freeSlot` asks: *what is the widest stretch of this line that no obstacle blocks?* For each obstacle polygon it finds how far the polygon reaches left and right inside the line's band (`bandExtent`, which looks at the corner points and at where each edge crosses the band's top and bottom), grows that by the offset, and collects the blocked intervals. The free stretches are the gaps between them; the widest wins. A stretch narrower than 1.5 font sizes is not worth using, so the line is **pushed down**.

### Flowing the story

`flowAroundObstacles` places lines one after another. For each line it asks for the free slot at the current height; if there is none, the line moves down a quarter line at a time until one appears; if the column is full, the next column starts. The composer is told each line's `x` offset and width (its **slot**) and sets that line's words in it.

### Loading the shape in the background

Reading pixels needs the image decoded, which takes a moment. The rows are worked out once per picture (cached by its source) and, until ready, the image wraps as its bounding box; the editor redraws when they arrive. Export waits for them first.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `boxPointOnPage`: rotating a point

```js file=apps/ZEditor/src/model/text/textWrap.js fn=boxPointOnPage
```

**The Logic:** a point `(bx, by)` is given relative to the box's own top-left corner. With no rotation (`!angle`) it is simply added to the box's position. Otherwise, `cx, cy` is the box's centre; `(dx, dy)` is the point relative to the centre; the standard **rotation matrix** turns it (`dx·cos − dy·sin`, `dx·sin + dy·cos`), and the centre and box position are added back. **Worked example.** A 100 × 40 box at (50, 50) turned 90°: its top-right corner is at `(bx, by) = (100, 0)`; `(cx, cy) = (50, 20)`, `(dx, dy) = (50, −20)`; with `cos 90° = 0`, `sin 90° = 1`: `x = 50 + 50 + (50 × 0 − (−20) × 1) = 120`, `y = 50 + 20 + (50 × 1 + (−20) × 0) = 120`. The corner moved from (150, 50) to (120, 120): it swung down around the centre.

### `wrapPolygons`

```js file=apps/ZEditor/src/model/text/textWrap.js fn=wrapPolygons
```

**The Logic:** `onPage(points)` turns a list of box-relative points into page points with the function above. `rect(x0, y0, x1, y1)` makes the four corners of a rectangle. For the *shape* mode: an ellipse gets 48 points (`for` loop, `t` from 0 to 2π, `cos` and `sin` of it scaled by the half-width and half-height, centred in the box); an image with `rows` gets one thin rectangle per opaque row, adjusted for the **crop** (`cropX`, `cropW`…: only the visible part counts, and rows outside it are skipped) and scaled from natural pixels to the box size (`kx = box.width / sw`). Everything else, including *box* mode, is the one plain rectangle. **Worked example (real output).** A rectangle at (50, 50), 100 × 40, "box" mode: `[[[50,50],[150,50],[150,90],[50,90]]]`: one polygon of four corners.

### `wrapObstaclesFor`: which obstacles touch this frame?

```js file=apps/ZEditor/src/model/text/textWrap.js fn=wrapObstaclesFor
```

**The Logic:** it returns `null` at once for frames that cannot wrap (not text, no set width, rotated, or special layouts). `left`, `right`, `top`, `bottom` are the frame's extent (`bottom` is `Infinity` if it has no fixed height). For each other item that wraps text, each of its polygons is tested: if (with the offset added on every side) it lies entirely left of, right of, above or below the frame (`continue`), it cannot matter. Otherwise it is kept, with every point moved to be **relative to the frame's top-left corner** (`x − frame.x`). The result is the list of obstacles, or `null` if none.

### `bandExtent` and `freeSlot`

```js file=apps/ZEditor/src/model/text/textWrap.js fn=bandExtent,freeSlot
```

**The Logic:**
- `bandExtent(pts, y0, y1)` finds how far a polygon reaches left and right within a horizontal band. `take(x)` updates the lowest and highest x seen. For every edge (from point `i` to the next, wrapping round with `% pts.length`): an end point inside the band counts, and where the edge **crosses** the top or bottom of the band (`(ay − yl) × (by − yl) < 0` is true when the two ends are on opposite sides of the line `yl`) the crossing x is found by **linear interpolation**, `ax + (bx − ax) × (yl − ay) / (by − ay)`.
- `freeSlot`: for each obstacle, the band is widened by the offset above and below, its extent is found, and widened by the offset left and right too, giving a **blocked interval**. The intervals are sorted by their left edge. The loop then sweeps left to right: `at` is the right end of what has been handled; if the next blocked interval starts after `at`, the gap `[at, b0]` is a candidate (`consider`); then `at` moves past it (`Math.max(at, b1)`, since intervals can overlap). The last gap runs to the right edge. `consider` keeps the **widest** gap that is at least `minWidth`. With no obstacle in the band the whole width is free.

**Worked example (real output).** A rectangle obstacle at `x 100…200`, `y 0…100`, offset 6, in a frame `0…300` wide, `minWidth = 20`:
- A line at `y 10…30`: blocked `[94, 206]`. Gaps: `[0, 94]` (94 wide) and `[206, 300]` (94 wide): equal, so the first is kept (the second would have to be wider): **`{ x: 0, width: 94 }`**.
- A line at `y 150…170`, below the object: no blocked interval: **`{ x: 0, width: 300 }`**, the whole width.
- If the obstacle sat at `x 50…150` instead: blocked `[44, 156]`; gaps 44 wide and 144 wide: the right one wins, **`{ x: 156, width: 144 }`**: the text sits right of the picture.

### `opaqueRows`: reading an image's outline

```js file=apps/ZEditor/src/render/wrapShapes.js fn=opaqueRows
```

**The Logic:** `data` is the picture's pixels (four numbers per pixel: red, green, blue, alpha). The outer loop cuts the picture into bands of `bandH` rows. For each band the leftmost opaque pixel (`x0`) and the rightmost (`x1`) over all its rows are found: a pixel counts when its alpha (`data[(y × w + x) × 4 + 3]`) is at least 24 (`ALPHA_CUTOFF`). If the band has any (`x1 > x0`), a row `{ y0, y1, x0, x1 }` is stored, scaled by `k` back to the picture's natural size. **Worked example.** A 100 × 100 image analysed as 96 bands: `bandH = ceil(100 / 96) = 2`, so about 50 bands of 2 rows. If band 10 (rows 20–21) has its first visible pixel at x = 30 and its last at x = 69, the row is `{ y0: 20, y1: 22, x0: 30, x1: 70 }`.

### `flowAroundObstacles`

```js file=apps/ZEditor/src/render/textLayout.js fn=flowAroundObstacles
```

**The Logic:**
- `pos[p][k]` remembers where line `k` of paragraph `p` goes; `after` is where the next paragraph starts.
- `place(p, k)` computes the position of line `k`, **lazily**: only when the composer asks. The first line of a paragraph starts where the last paragraph ended, plus the paragraph gap; later lines are one line height below the previous.
- The guarded loop (`for (let guard = 0; guard < 4000; guard++)` cannot run forever) tries to find a slot: if the column is full (`top + lineHeight > H`), go to the next column (`col++; top = 0`); otherwise ask `freeSlot` for the band `[padY + top, padY + top + lineHeight]`; if there is one, done; if not, move down by `step = lineHeight / 4` and try again. Past the last column the line is parked at `top = H` (hidden).
- The composer is run with `slotFor: place`, so for every line it receives the free stretch's `x` and `width`.
- Afterwards each line gets its column, top and final `x`, and lines past the last column are `hidden` (and `overflow` set).

**Worked example.** Line height 20, `step = 5`. A picture blocks the whole width from y = 40 to y = 90. Line at `top = 40`: the slot is `null` (no 1.5-em wide stretch), so `top` moves 45, 50 … 90 in steps of 5 until the band `[90, 110]` is free: the line is set there, 50 px lower. The text appears to **jump** over the picture.

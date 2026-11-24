## Intro

The **Measure tool** (**U**) tells you how far apart two points on the page are: the straight distance, the horizontal and vertical legs, and the angle. It is only a ruler for your eyes: nothing it draws is saved or exported.

## How to use

1. Press **U** (or choose Measure in the toolbar).
2. **Click** point **a**, then **click** point **b**: the line and the readout appear. You can also press at **a** and drag to **b**.
3. **Drag either end** to adjust. A **third click** clears it, a fourth starts a new one.
4. **Shift** snaps the line to the nearest 45° from point a. **Alt** skips snapping to ruler guides.
5. The numbers use the unit chosen in **Ruler Guide** (mm, cm, in or pt).

The readout shows the length in bold, then `Δx`, `Δy` and the angle in degrees, counted anticlockwise from the right (as on paper).

## How it works

### Page pixels to real units

The tool works in editor pixels, but an editor pixel is `1 / 1.1` of a point (`MAIN_SCALE = 1.1`). It divides by `MAIN_SCALE` to get points, which are then shown in your unit. 72 points make an inch, so the numbers are real paper sizes, independent of zoom.

### Pythagoras and `atan2`

For two points the legs are `dx = bx − ax` and `dy = by − ay`. The distance is `length = hypot(dx, dy)` (√(dx² + dy²)), and the angle comes from `atan2(−dy, dx)`. The minus sign is there because on screen y grows *downwards*, while angles on paper grow *upwards*. The angle is rounded to a tenth of a degree and shifted into 0–360.

### Snapping to guides

A clicked point is pulled onto a nearby ruler guide with the same `snapToGuides` function used for moving items, using a degenerate box (a point with no size). The threshold is 6 *screen* pixels, divided by the zoom, so it feels the same at any zoom.

### Shift: nearest 45° line

`constrainTo45` measures the pointer's angle from point a, rounds it to the nearest multiple of 45° (`Math.round(angle / (π/4)) × (π/4)`), and puts the point on that ray at the **same distance**, so only its direction changes.

### Keeping the label legible

The overlay sits inside the zoomed page, so lengths are in page pixels. Anything that should stay the same on-screen size, the handles and the label, is scaled by `1 / zoom`. The label flips to the other side of the end point near the page's right or bottom edge so it never leaves the view.

### One at a time, per page

A measurement belongs to the page and the tool it was made on: it is cleared when you switch pages or tools.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `measureBetween`

```js file=apps/ZEditor/src/model/rulers.js fn=measureBetween
```

Reading it:
- `dx` and `dy` are the horizontal and vertical legs between the points: end minus start.
- `Math.hypot(dx, dy)` is the square root of `dx² + dy²`: the **Pythagorean** distance, the straight line between the points.
- `Math.atan2(-dy, dx)` is the angle. The minus sign flips `dy` because screen y grows downwards but paper angles grow upwards. Multiplying by `180 / Math.PI` converts radians to degrees; `Math.round(... * 10) / 10` rounds to one decimal. `(deg + 360) % 360` turns the −180…180 result into 0…360.
- The function returns an object with four values at once.

### `constrainTo45`

```js file=apps/ZEditor/src/model/rulers.js fn=constrainTo45
```

Reading it: `step` is π/4 radians (45°). `Math.atan2(dy, dx) / step` says "how many 45° steps is this angle?"; `Math.round(...)` picks the nearest whole number of steps; multiplying back by `step` gives the snapped angle `a`. The result keeps the **same length** `len` (from `Math.hypot`) but along that angle: `from.x + cos(a) · len`, `from.y + sin(a) · len`.

### `measurePoint`: where a click lands

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx fn=measurePoint
```

Reading it: `let p = overlayPoint(ev)` is the pointer in page coordinates (`let` allows reassigning later, unlike `const`). If there are guides and Alt is not held (`!ev.altKey`), the point is treated as a box of zero size and `snapToGuides` returns the nudge, which is added. Then, if Shift is held and a start point exists (`ev.shiftKey && from`), `constrainTo45` is applied. `cond ? a : b` returns one of the two.

### `startMeasure`: the click logic

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx fn=startMeasure
```

Reading it:
- It uses the state `measure`, which is `null` (nothing), or `{ a, b, pending }`. `pending` means "point a is set, waiting for the second click".
- Three cases, each ending in `return`: if pending, this click is the **second** (it sets `b`); if a measurement exists, this is the **third** click and clears it; otherwise it is the first click.
- On a first press it sets `a`, then calls `trackPointerDrag` (see [Move, resize and rotate](zeditor/arrange/move-resize-rotate)). If the pointer moves further than `DRAG_THRESHOLD`, it is a drag and `b` follows the pointer; if it was only a click (`!moved`), `pending: true` is set and the next click fixes `b`.
- `gesture = (measureGesture.current = {})` creates a fresh object as an **identity tag** for this press. Later callbacks compare against it (`measureGesture.current !== gesture`) so a stale release from an earlier press cannot act on a newer one.

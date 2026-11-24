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

Distance and angle between two points:

```js file=apps/ZEditor/src/model/rulers.js
export function measureBetween(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const deg = Math.round(((Math.atan2(-dy, dx) * 180) / Math.PI) * 10) / 10; // -180..180, to a tenth
  return { dx, dy, length: Math.hypot(dx, dy), angle: (deg + 360) % 360 };
}
```

Shift: the nearest 45° line, same distance.

```js file=apps/ZEditor/src/model/rulers.js
  const step = Math.PI / 4, len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
```

Editor pixels to points:

```js file=apps/ZEditor/src/ui/canvas/MeasureOverlay.jsx
  const pt = measureBetween({ x: a.x / MAIN_SCALE, y: a.y / MAIN_SCALE }, { x: b.x / MAIN_SCALE, y: b.y / MAIN_SCALE });
```

A clicked point snaps to a guide unless Alt is held:

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
    if (lines && !ev.altKey) {
      const snap = snapToGuides({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }, lines, SNAP_PX / zoom);
      p = { x: p.x + snap.dx, y: p.y + snap.dy };
    }
```

The three clicks:

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
    if (measure && measure.pending) { // the 2nd click
      setMeasure({ ...measure, b: measurePoint(e, measure.a), pending: false });
```

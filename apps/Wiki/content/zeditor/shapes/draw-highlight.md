## Intro

**Draw** (**D**) is a freehand **pen**; **Highlight** (**H**) is a wide, translucent **marker**. Both record the path your pointer follows and turn it into a smooth line item. A pen line can be given a **taper**, so it thins to a point at each end, like a brush stroke.

## How to use

- Press **D** (pen) or **H** (highlighter) and drag on the page. Release to finish a stroke. A stroke needs at least two points.
- Before drawing, or afterwards in the Format panel: **Color** (swatches, or any colour), **Width** (pen 1–20, default 2.5; highlighter 6–40, default 14) and, for the pen, **Taper** (0–100%; 0 keeps a constant, round-ended width).
- The highlighter is 45% opaque and yellow by default (swatches: yellow, orange, blue, pink, green), so text stays readable under it.
- Select a stroke and drag its round knob to rotate it. The **Eraser** can remove whole strokes (see [Eraser](zeditor/eraser-marquee/eraser)).
- Drawing works on the outer canvas too, outside the page.

## How it works

### Recording points

While the mouse is down, every pointer move adds its position to a list of **points**. The stroke is stored as that list plus its tool, colour, width and taper. The list is raw (jagged, with one point per mouse event), so it is smoothed when drawn.

### Smoothing: curves through the midpoints

A very common freehand trick: instead of joining the points with straight lines, draw a **quadratic curve** to the **midpoint** of each pair of points, using the shared point as the curve's **control point**. The curve is pulled towards the point but does not pass through it, which rounds off jagged corners. No pressure data (a mouse has none) and no library are needed.

### Taper: a filled outline

An SVG line has one width along its whole length, so a tapered line cannot be a plain stroke. Instead the code builds a **filled shape**: at every point it computes the **normal** (the direction at right angles to the stroke) and places one outline point half the local width to the left and one to the right. Joining all the left points forwards and the right points backwards gives a closed silhouette. The local width changes along the stroke: it ramps up over the first part (the *taper* fraction of the total length, up to 45%), stays full, and ramps down over the last part. The width never goes below 12% of the base, so the tip is not infinitely sharp.

### Hit-testing for the eraser

To decide whether the eraser touches a stroke, the code measures the distance from the pointer to every **segment** of the stroke's raw points and compares it with half the stroke's width plus a margin of 6 px.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `smoothPathD`

```js file=apps/ZEditor/src/model/strokes.js fn=smoothPathD
```

**The Logic:** the result is an SVG path text. Fewer than 2 points give nothing; exactly 2 give a straight line (`M x,y L x,y`). Otherwise: start at the first point (`M`); for each middle point `i` the curve `Q x0,y0 mx,my` goes to the **midpoint** `(mx, my)` of points `i` and `i + 1`, with point `i` as the control; finally a straight `L` to the last point.

**Worked example (real output).** Points `(0,0) (10,0) (20,10) (30,10)`: **`M 0,0 Q 10,0 15,5 Q 20,10 25,10 L 30,10`**. The first curve heads towards the corner at (10, 0) and ends at the midpoint (15, 5) of (10, 0) and (20, 10); the second heads towards (20, 10) and ends at the midpoint (25, 10); the line finishes at (30, 10). The path never touches the corners (10, 0) or (20, 10): they round off.

### `taperedPathD`

```js file=apps/ZEditor/src/model/strokes.js fn=taperedPathD
```

**The Logic:**
- `dists` holds the **running distance** along the stroke at every point (each step adds `Math.hypot(dx, dy)`). `total` is the length, `tf` the taper fraction clamped to 0–0.45.
- `widthAt(t)` gives the width at fraction `t` of the length: `t / tf` rising in the first `tf`, `(1 − t) / tf` falling in the last `tf`, 1 in between; times the base width, never below `baseWidth × 0.12`.
- For each point, `w` is half the local width. The stroke's **direction** at the point is taken from its neighbours (`next − prev`, normalised by dividing by its length `len`); the **normal** is that vector turned a quarter turn: `(nx, ny) = (−dy, dx)`. `left` and `right` get the point shifted by `± w` along the normal.
- The path goes along the left points forwards (`L` lines) and along the right points **backwards**, then closes (`Z`): a thin closed silhouette to be **filled**.

**Worked example (real output).** A straight stroke `(0,0) (10,0) (20,0)`, width 4, taper 0.45. The direction is horizontal, so the normal is vertical. Widths: at `t = 0`: `factor = 0 / 0.45 = 0`, so the width is `max(4 × 0.12, 0) =` 0.48, half **0.24**; at `t = 0.5`: in the full-width middle (0.5 is not below 0.45 and not above 0.55), width 4, half **2**; at `t = 1`: 0.48 again. The outline is **`M 0,0.24 L 10,2 L 20,0.24 L 20,-0.24 L 10,-2 L 0,-0.24 Z`**: a pointed lens shape, fat in the middle.

### `strokeHitTest` and `distToSegment`

```js file=apps/ZEditor/src/model/strokes.js fn=distToSegment,strokeHitTest
```

**The Logic:** `distToSegment` finds the closest point on a segment to `p`: `t` is the **projection** of `p` onto the segment (the dot product divided by the segment's squared length, with 0 if the segment has no length), clamped to 0–1 so the closest point cannot lie beyond the ends, and the distance is `Math.hypot` to that point. `strokeHitTest` returns true if any segment is within `strokeWidth / 2 + 6` of the pointer.

**Worked example.** A pen stroke (width 2.5) has the segment from `(0,0)` to `(10,0)`; the eraser is at `(5, 3)`. `t = ((5 − 0) × 10 + (3 − 0) × 0) / 100 = 0.5`; the closest point is `(5, 0)`; the distance is **3**. The threshold is `2.5 / 2 + 6 = 7.25`; 3 ≤ 7.25, so it is a hit. At `(5, 9)` the distance is 9 > 7.25: a miss. A highlighter of width 14 has threshold `14 / 2 + 6 = 13`.

### `drawStrokeOnCanvas`

```js file=apps/ZEditor/src/render/drawShapes.js fn=drawStrokeOnCanvas
```

**The Logic:** the highlighter flag decides the defaults (colour, width) and the opacity (`ctx.globalAlpha = isHi ? 0.45 : 1`). The width and points are multiplied by `scaleFactor` for the export resolution. With a taper, the silhouette from `taperedPathD` is **filled**; without, the smoothed path is **stroked** with a round cap and join (`lineCap = "round"`: rounded ends). `new Path2D(text)` turns an SVG path text into a shape the canvas can draw. `save()`/`restore()` keep the opacity from leaking onto other items.

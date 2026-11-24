## Intro

The **Marquee** (**M**) marks an **area** of the page: a rectangle, a free-form **polygon**, or a painted **brush** shape. The marked area is the input for the tools that follow: [Make layer](zeditor/eraser-marquee/make-layer) (copy or cut the area into its own layer) and [Remove & fill](zeditor/eraser-marquee/remove-and-fill) (erase what is there and fill it from the surroundings). The name comes from the "marching ants" selection outline of paint programs.

## How to use

- Press **M**, then choose the **shape** in the Format panel:
  - **Rectangle:** drag a box. **Shift** makes it square, **Alt** draws it out from the centre. Handles resize it, a knob rotates it.
  - **Polygon:** click to add points (Shift: a 45° line from the last point). Click the **first point**, or **double-click / double-tap**, or press **Enter** to close it. **Backspace** takes the last point back. On a touch screen use the touch bar's **Close** and **Undo point**.
  - **Brush:** paint the area (size 24 by default, **[** and **]** make the brush smaller or bigger, 2 to 300). A switch makes the brush **erase** parts of what you painted.
- **Esc** drops the marquee. It also goes when you change page or shape. It stays on the page while you use other tools, for when you pick M again.
- A rectangle smaller than 4 px counts as a click, not a marquee; a polygon needs at least 3 points.
- A switch can **hide** the marked area's outline to look at the result without it.

## How it works

### Three shapes, one "area"

The three shapes are stored differently but all become the same thing for the tools that follow: an **area** in the pixels of whatever picture is being worked on, either a **polygon** (a list of corner points) or a list of **brush strokes**. Rectangle and polygon give a polygon (a rectangle is its four corners). Because every later tool only ever sees an area, a new shape needs only a function that makes one.

### A rectangle that can be turned

A rectangle marquee is `{ x, y, width, height, angle }`: a box turned about its centre. To get its corners, each corner offset from the centre is **rotated** by the angle with the usual rotation formula, and added back to the centre.

### Polygon: closing, and the even-odd rule

Each click adds a point, but a click **close to an existing point** means something else, and "close" is measured in **screen pixels** so it is the same at every zoom: within 10 px of the *first* point closes the polygon (if it has at least three points); within 4 px of the *last* point is a repeat (a double click closes it, a single repeat is ignored). To decide whether a page point is **inside** a polygon, the **even-odd rule** (a *ray casting* test) is used: draw a ray from the point to the right and count how many polygon edges it crosses. Odd means inside, even means outside.

### Brush: strokes, not pixels

A brush marquee is kept as the **strokes** that painted it (page position, size, whether it erases), not as a picture of pixels. It therefore stays sharp at any zoom and in the export, and an erasing stroke removes what the strokes before it painted (a stroke drawn with the `destination-out` blend rule).

### Rotating and moving

Moving adds the same offset to every coordinate (translation). Rotating turns every point about the marquee's centre; a rectangle only needs its centre moved round and its angle increased, so it stays a rectangle.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `regionPolygon`

```js file=apps/ZEditor/src/model/marquee.js fn=regionPolygon
```

**The Logic:** it returns the marquee's outline as a list of points whatever its shape. A brush gives the four corners of its bounding box. A polygon gives a copy of its points. A rectangle: `[[-1,-1],[1,-1],[1,1],[-1,1]]` are the four corners as signs (−1 or +1); each is scaled by half the width and height, **rotated** by the angle with `rotatePoint`, and added to the centre `(cx, cy)`. **Worked example (real output).** A 100 × 50 rectangle at `(50, 75)` (centre `(100, 100)`), turned 90°: the corners are **`(125,50) (125,150) (75,150) (75,50)`**: the box is now 50 wide and 100 tall around the same centre.

### `rotatedMarquee`

```js file=apps/ZEditor/src/model/marquee.js fn=rotatedMarquee
```

**The Logic:** brush and polygon: every point is moved `(x − cx, y − cy)`, rotated, and moved back. A rectangle: its **centre** is rotated about `(cx, cy)`, and the rectangle is rebuilt around the new centre with its `angle` increased by `degrees`, wrapped into 0–359 with `(((a + d) % 360) + 360) % 360`. **Worked example (real output).** The same 100 × 50 rectangle rotated 90° about `(50, 50)`: its centre `(100, 100)` is `(50, 50)` away from the pivot; rotated 90° that offset becomes `(−50, 50)`, so the new centre is `(0, 100)`; `x = 0 − 100 / 2 = `**−50**, `y = 75`, and `angle = 90`.

### `pointInPolygon`: the even-odd rule

```js file=apps/ZEditor/src/model/marquee.js fn=pointInPolygon
```

**The Logic:** `inside` starts false. The loop goes round every edge from point `j` to point `i` (`j` starts at the last point, so the last edge connects back to the first; `j = i++` makes `j` follow `i`). For each edge, `(yi > y) !== (yj > y)` is true when the edge **straddles** the horizontal line at height `y`, i.e. one end is above and the other below. `x < (xj − xi) × (y − yi) / (yj − yi) + xi` computes where the edge crosses that line (**linear interpolation**) and asks whether the point is to the **left** of the crossing, which means the ray going right hits it. Each such crossing **toggles** `inside` (`inside = !inside`): odd crossings mean inside.

**Worked example (real output).** The square `(0,0) (10,0) (10,10) (0,10)`. Point `(5, 5)`: the right-hand edge from `(10,0)` to `(10,10)` straddles `y = 5`, crosses at `x = 10`, and `5 < 10`: toggle once → **true**. The left edge also straddles but crosses at `x = 0` and `5 < 0` is false: no toggle. Point `(15, 5)`: `15 < 10` is false for both edges, no toggles → **false**.

### `polygonPressAction`

```js file=apps/ZEditor/src/model/marquee.js fn=polygonPressAction
```

**The Logic:** `near([x, y], px)` is true when the press is within `px` **screen** pixels of a point: the page distance `hypot(…)` times `pxPerUnit` (the zoom). `enough` requires at least 3 points. Close if enough points and the press is within 10 px of the first or 4 px of the last; ignore a press within 4 px of the last point when it cannot close; otherwise add. **Worked example (real output).** A square polygon `(0,0) (100,0) (100,100) (0,100)` at zoom 1: a press at `(3, 4)` is 5 px from the first point: **close**. A press at `(60, 60)`: **add**. A press at `(100, 98)`: 100 px from the last point `(0,100)`: **add**. With only two points so far and a press on the last one at `(100, 0)`: not enough points to close, but near the last: **ignore**.

### `brushBounds`, `isUsableMarquee`

```js file=apps/ZEditor/src/model/marquee.js fn=brushBounds,isUsableMarquee
```

**The Logic:** `brushBounds` takes the bounding box of all painted points, grown by the brush's **radius** (`size / 2`) on every side, ignoring erasing strokes; it returns `null` if nothing is painted (`x1 < x0` while the values are still `Infinity`/`-Infinity`). `isUsableMarquee` says whether the marquee can be used: a brush needs at least one painting stroke, a polygon must be closed with 3 or more points, a rectangle at least 4 × 4. **Worked example (real output).** A painting stroke of size 20 through `(10,10)` and `(50,10)`, plus an erasing stroke of size 30 at `(200,200)`: bounds **`x 0…60, y 0…20`** (the erasing stroke does not count). A `3 × 50` rectangle is not usable; `4 × 4` is.

### The area for the tools: `areaFromRegion`, `mapAreaToImage`, `paintArea`

```js file=apps/ZEditor/src/render/regionArea.js fn=areaFromRegion,mapAreaToImage,paintArea
```

**The Logic:**
- `areaFromRegion(region, scale)` converts the marquee (in page pixels) to an area in the pixels of a picture drawn at `scale` pixels per page pixel: a brush keeps its strokes (positions and sizes multiplied by the scale); anything else becomes a polygon from `regionPolygon`.
- `mapAreaToImage(area, image)` converts it into a **placed image's own pixels** (allowing for its position, scale, rotation and crop) with `imagePixelAt`. A brush's width is scaled by the image's average scale: `k` is the average of the lengths of one page pixel measured along the picture's two axes (`hypot`).
- `paintArea(ctx, area, { grow, dx, dy })` draws the area **solid black** onto a canvas, to be used as a mask (only its alpha matters). For a polygon: `fill` plus a `stroke` of `2 + 2 × grow` pixels, so every pixel the outline touches is included (no rim of old pixels is left) and `grow` swells it all round. For a brush: each stroke is drawn as a thick round line; an erasing stroke uses `destination-out` on a separate temporary canvas so it only rubs out the marks drawn before it, not the picture under them.

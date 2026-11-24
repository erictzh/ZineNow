## Intro

The **Rectangle** (**R**) and **Ellipse** (**E**) tools draw filled shapes. They are the same kind of item: an ellipse is simply a rectangle whose outline is an ellipse, so everything works on both: fill and gradient, rounded or torn edges (rectangles), stroke, shadow, texture, rotation, text wrap.

## How to use

- Press **R** or **E**, then **drag** on the page. **Click** (no drag) for a default 160 × 110 shape centred on the click. **Hold Shift** while dragging for a perfect **square** or **circle** (you can press or release Shift mid-drag).
- The new shape is selected and the tool returns to Move, so you can adjust it at once with the handles (**Shift** keeps its proportions) and the Format panel: **Fill**, **Transform** (rotation, size readout), **Effects**, **Text wrap**.
- **Rasterize to Image** turns the shape into a picture of how it looks now, so image-only tools (filters, crop) can be used on it.
- A shape can be as thin as 2 px, so a rectangle works as a **rule** (a line).
- For an outline, use the **Stroke** effect; for rounded corners, **Rounded** (not on ellipses).

## How it works

### Dragging out a box

While the mouse moves, a **drag box** is computed from the start point and the pointer. It is always the rectangle with those two as opposite corners (`Math.min`/`Math.abs`, so you can drag in any direction). With Shift, the box becomes a **square**: both sides take the *longer* of the two, keeping each one's direction.

### An ellipse is a rectangle with a flag

The item stores `type: "rect"` and, for ellipses, `shape: "ellipse"`. Its **outline** (the path used to clip, stroke, shadow and texture it) is drawn with SVG **arcs**. Since everything else reads the outline, no effect needs ellipse-specific code.

### The ellipse outline: two arcs

An SVG arc command is `A rx ry rotation large-arc-flag sweep-flag x y`: draw an elliptical arc with these radii to the point `(x, y)`. A whole ellipse is drawn as **two half-ellipse arcs**: from the left middle to the right middle, then back. (One arc cannot do a full circle, because its start and end would be the same point.)

### Fill

The fill is a solid colour or a gradient; see [Stroke, fill and gradients](zeditor/shapes/stroke-fill).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `dragBox`

```js file=apps/ZEditor/src/model/geometry.js fn=dragBox
```

**The Logic:** `dx`, `dy` are how far the pointer is from the start (they can be negative). With `square`, `side` is the larger of their absolute values, and both are set to that size keeping their sign (`dx < 0 ? -1 : 1`). `fromCenter` makes the start point the middle (the box extends the same distance the other way). The result is built from the two corners with `Math.min` for the top-left and `Math.abs` for the size, so the box is correct whichever way you dragged.

**Worked example.** Start (100, 100), pointer (160, 130): `dx = 60`, `dy = 30` → **`{ x: 100, y: 100, width: 60, height: 30 }`**. With Shift: `side = max(60, 30) = 60` → **60 × 60**. Dragging up-left to (40, 70): `dx = −60`, `dy = −30`; square: `dx = −60`, `dy = −60` → `x = min(100, 40) = 40`, `y = 40`, **60 × 60**: the square grows up and left from the start. With `fromCenter` and `dx = 60`: `x0 = 100 − 60 = 40`, `x1 = 160`: width **120**, centred on the start.

### `handleAddRect`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleAddRect
```

**The Logic:** a new id; the new item is `type: "rect"`, with `shape: "ellipse"` if the Ellipse tool is active (`tool === "ellipse" ? "ellipse" : undefined`, an ordinary rectangle has no shape). The size is the drag box but at least `MIN_RECT_SIZE = 2` (`Math.max`). `...toolDefaults.rectDefaults` spreads the remembered fill look into the item. Afterwards the Move tool is selected and the new shape is selected.

### `ellipseOutline`, `rectOutline`

```js file=apps/ZEditor/src/model/outlines.js fn=rectOutline,ellipseOutline,isEllipse
```

**The Logic:** `rectOutline` is the path `M0 0 H width V height H0 Z` (move to the corner, horizontal line, vertical line, horizontal line back, close). `isEllipse` is a one-line test of the flag. `ellipseOutline` makes `rx` and `ry` (half the width and height) and writes a path: move to the left middle `(0, ry)`, an arc to the right middle `(width, ry)`, and another arc back, then close. The `1 1` flags choose the large arc and the clockwise sweep (for a half-ellipse these only decide which way round). **Worked example (real output).** A 100 × 60 ellipse: **`M0 30A50 30 0 1 1 100 30A50 30 0 1 1 0 30Z`**: start at the left (0, 30), arc to the right (100, 30) with radii 50 and 30, and back.

### `drawRectOnCanvas`

```js file=apps/ZEditor/src/render/drawShapes.js fn=drawRectOnCanvas
```

**The Logic:** a shape is drawn by `drawBoxWithEffects` (see [Effects](zeditor/images/effects)), which handles rotation, the outline clip, stroke, shadow and texture, and is handed a small function `(target) => paintRectFill(target, ann)` to paint the inside. A function given to another function to be called later is a **callback**. That is why a rectangle and a picture share the same effects code.

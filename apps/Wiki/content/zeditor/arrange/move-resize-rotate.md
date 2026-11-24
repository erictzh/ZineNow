## Intro

The **Move tool** (**V**) selects items and changes them: drag to move, drag a **handle** to resize, drag the **knob** above to rotate. It works on text boxes, images, shapes and strokes, and on several items at once.

## How to use

- **Select:** click an item, or drag on empty page to select everything the box touches. **Shift+click** adds or removes items.
- **Move:** drag an item. Items snap onto ruler guides (hold **Alt** to move freely). **Arrow keys** nudge 1 px, **Shift+arrows** 10 px.
- **Resize:** drag a handle on a corner or side. The opposite side stays where it is. **Shift** keeps the proportions of a rectangle (and stretches an image freely, since images keep theirs by default).
- **Rotate:** drag the round knob above the item. The item turns towards the pointer; **Shift** snaps to every 15°.
- **Several items or a stroke:** a dashed outline and a knob appear around the whole selection, and rotating turns everything about its middle.
- On a touch screen, use the touch bar's Shift and Alt switches for the modifier keys.

## How it works

### A press is not yet a drag

A press only becomes a drag after the pointer has moved more than **4 screen pixels** (`DRAG_THRESHOLD`), so an ordinary click, with its tiny natural wobble, never moves anything by accident.

### Following the mouse everywhere

`trackPointerDrag` attaches `mousemove` and `mouseup` to the **window**, not to the item, so the drag keeps working when the pointer leaves the page or crosses a panel, and removes them again on release. Every drag in ZEditor uses this one helper.

### Distances in the item's own space

The pointer moves in screen pixels, but items live in page pixels, and may be rotated. `dragDeltaFrom` divides the movement by the **zoom** and then rotates it back by the item's **angle**, so the delta arrives in the item's own, unrotated axes. That is what resizing needs: dragging the east handle of a box turned 30° must widen it along *its* east, not along the screen's.

### Resizing a rotated box: keep the anchor still

A box turns about its **centre**, so changing its width would normally shift every corner. To keep the opposite side or corner fixed on the page, `resizedBox` works out where that anchor is before and after (as an offset from the centre, rotated by the angle) and moves the centre by the difference. A handle name like `"se"` gives signs (east = +1, west = −1, south = +1, north = −1) that say which sides move. Boxes cannot go below 20 px. With **keepAspect** the scale is the larger of the two ratios for a corner, so the box follows the pointer on its longer pull.

### Rotation: a bit of trigonometry

The knob's angle is `atan2(dy, dx)` of the pointer relative to the item's centre, converted from radians to degrees, plus 90° so that straight up is 0°. `atan2` is the right tool because it returns the correct angle in all four quadrants. Rounding to a multiple of 15 gives the Shift snap, and `((d % 360) + 360) % 360` keeps the result in 0–359 even for negative angles.

### Rotating a selection

For a selection of several items (or a stroke, which has no box of its own), the code takes the **union of the bounding boxes**, finds its centre, and for each pointer move rotates every item about that centre by the *change* in angle since the press (not the absolute angle, so nothing jumps when you grab the knob).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `trackPointerDrag`: follow the mouse everywhere

```js file=apps/ZEditor/src/ui/pointer.js fn=trackPointerDrag
```

**The Logic:**
- It takes two **callbacks**: functions handed in to be called later. `onMove` runs on every mouse movement, the optional `onUp` once at the end.
- `move` and `up` are small functions defined inside. `window.addEventListener("mousemove", move)` tells the browser "call `move` whenever the mouse moves anywhere in the window". Attaching to the window (not the item) is why dragging keeps working when the pointer leaves the page.
- When the button is released, `up` runs: it **removes both listeners** (so nothing keeps running), then calls `onUp` if one was given (`if (onUp)`). Because `move` and `up` are the very same function objects that were added, `removeEventListener` can find and remove them.

### `dragDeltaFrom`: how far, in the item's own axes

```js file=apps/ZEditor/src/ui/pointer.js fn=dragDeltaFrom
```

**The Logic:** it receives the event that started the drag and returns **a function** (it builds the function `(ev) => ...`, which remembers `startX`, `startY`, `zoom` and `angle`: a **closure**). Each later mouse event goes through it: the pointer's change since the start is divided by `zoom` (screen pixels to page pixels), then rotated by `-angle` so the result is expressed along the item's own axes.

### `rotatePoint`: the rotation formula

```js file=apps/ZEditor/src/model/geometry.js fn=rotatePoint
```

**The Logic:** `degrees * Math.PI / 180` converts to **radians**. The classic 2D rotation is `x' = x·cos θ − y·sin θ`, `y' = x·sin θ + y·cos θ`: that is the returned pair `[..., ...]` (an array of two numbers). On a screen, y points down, so positive angles turn **clockwise**.

### `resizedBox`: resizing while the opposite side stays put

```js file=apps/ZEditor/src/model/geometry.js fn=resizedBox
```

**The Logic:**
- `handle` is a compass name like `"se"`. `handle.includes("e")` asks whether the letter is in it, giving the sign: +1 (east or south), −1 (west or north), 0 (that axis not moved). `signX * dx` is how the width changes.
- With `keepAspect`, the two scale factors are compared; for a corner the bigger wins, for a side the one that moves. `minScale` stops the box shrinking below 20 px on its short side. Without it, each side is just clamped to at least `minSize`.
- **The anchor trick.** A box is stored by its top-left corner but rotates about its centre. To keep the opposite side fixed after a resize, the code computes the anchor's position *relative to the centre* before and after (`oldOffset`, `newOffset`, each rotated by the box's angle) and shifts the centre by the difference. The final line turns the centre back into a top-left corner: `centerX - width / 2`.

### `startRotateDrag`: the rotation knob

```js file=apps/ZEditor/src/ui/canvas/ResizeHandles.jsx fn=startRotateDrag
```

**The Logic:**
- `e.currentTarget.parentElement.getBoundingClientRect()` measures the item's box on screen; its middle is `centerX`, `centerY`. (The knob's parent is the item, already rotated, so the box is centred on the item.)
- `Math.atan2(y, x)` returns the angle of a direction in radians, correct in all four quadrants (plain division would not tell "up-left" from "down-right"). Times `180 / Math.PI` gives degrees; `+ 90` makes straight up the zero point.
- With Shift the angle is `Math.round(degrees / 15) * 15`: divide, round to a whole number, multiply back, which snaps to the nearest 15°.
- `((degrees % 360) + 360) % 360` brings any number into 0–359. In JavaScript, `%` can give negative results for negative numbers; adding 360 first and taking `%` again fixes that.

### Rotating several items

```js file=apps/ZEditor/src/ui/canvas/SelectionTurn.jsx fn=selectionTurnFor,startSelectionTurn
```

**The Logic:**
- `selectionTurnFor` decides whether a knob is needed: only for the Move tool, and for more than one item or a single stroke. `.filter` keeps visible, unlocked, selected items.
- It computes the four edges of the whole selection with `Math.min(...)` and `Math.max(...)` over all the items' bounding boxes (`...bounds.map(...)` spreads a list into separate arguments), and returns the box and its centre `(cx, cy)`.
- `startSelectionTurn` records the pointer's angle at the press (`startAngle`). On each move it computes the **change** in angle (`delta`), optionally snapped to 15°, and asks `onRotateAnnotations` to turn all the items about the centre by it. Using the change, not the absolute angle, means grabbing the knob does not make the items jump.

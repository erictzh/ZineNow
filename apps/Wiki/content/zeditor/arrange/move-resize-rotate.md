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

**Worked example.** The page is shown at 200% (`zoom = 2`). The pointer moved 100 px right on screen.
- Item not rotated (`angle = 0`): `rotatePoint(100 / 2, 0 / 2, 0)` = (50, 0). The item moves 50 page pixels right.
- Item turned 90° clockwise (`angle = 90`): its own x-axis now points *down* the screen. `rotatePoint(50, 0, −90) = [50 × cos(−90°) − 0, 50 × sin(−90°) + 0]` = **(0, −50)**: moving right on screen is "50 in the negative y direction of the item", which is what a resize handle on the item's side needs to know.

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

**Worked example.** A box at x = 100, y = 100, 200 wide, 100 tall; no rotation.
- Drag the **east** handle by `dx = 40`: `signX = 1`, `signY = 0`, so `width = 240`, `height = 100`. The anchor is the west edge (`anchorX = 0`). `oldOffsetX = (0 − 0.5) × 200 = −100`, `newOffsetX = (0 − 0.5) × 240 = −120`. `centerX = 100 + 100 + (−100) − (−120) = 220`, and `x = 220 − 120 = 100`: the west edge stays at 100 and the box is now 240 wide.
- Drag the **west** handle by `dx = −40` (outward): `signX = −1`, `width = 200 + (−1)(−40) = 240`. The anchor is the east edge (`anchorX = 1`): `oldOffsetX = +100`, `newOffsetX = +120`, `centerX = 200 + 100 − 120 = 180`, `x = 180 − 120 = 60`. The box now spans 60…300: the east edge stayed at 300.
- **Shift on the south-east corner**, `dx = 40`, `dy = 0`: `scaleX = 240 / 200 = 1.2`, `scaleY = 100 / 100 = 1`; for a corner the larger one is used, 1.2, so the box becomes **240 × 120**: proportions kept.
- **Rotated 90°**: the same east drag of 40 along the box's own axis. `oldOffset = rotatePoint(−100, 0, 90) = (0, −100)` and `newOffset = rotatePoint(−120, 0, 90) = (0, −120)`. The centre moves by `(0, −100) − (0, −120) = (0, +20)`: **20 px down the screen**, which is "east" for a box turned 90°. The west side, now the top, stays where it was.

### `startRotateDrag`: the rotation knob

```js file=apps/ZEditor/src/ui/canvas/ResizeHandles.jsx fn=startRotateDrag
```

**The Logic:**
- `e.currentTarget.parentElement.getBoundingClientRect()` measures the item's box on screen; its middle is `centerX`, `centerY`. (The knob's parent is the item, already rotated, so the box is centred on the item.)
- `Math.atan2(y, x)` returns the angle of a direction in radians, correct in all four quadrants (plain division would not tell "up-left" from "down-right"). Times `180 / Math.PI` gives degrees; `+ 90` makes straight up the zero point.
- With Shift the angle is `Math.round(degrees / 15) * 15`: divide, round to a whole number, multiply back, which snaps to the nearest 15°.
- `((degrees % 360) + 360) % 360` brings any number into 0–359. In JavaScript, `%` can give negative results for negative numbers; adding 360 first and taking `%` again fixes that.

**Worked example.** The item's centre is at (200, 200) on screen.
- Pointer at (300, 200), straight right: `atan2(0, 100) = 0°`, `+ 90` = **90°**. The knob points right.
- Pointer at (200, 100), straight up: `atan2(−100, 0) = −90°`, `+ 90` = **0°**: upright.
- Pointer at (100, 200), straight left: `atan2(0, −100) = 180°`, `+ 90` = 270°.
- Pointer at (200, 300), straight down: `atan2(100, 0) = 90°`, `+ 90` = 180°.
- **With Shift**, an angle of 37° becomes `Math.round(37 / 15) × 15 = 2 × 15 =` **30°**.
- A negative angle, `−20`: `((−20 % 360) + 360) % 360 = (−20 + 360) % 360 =` **340°**.

### Rotating several items

```js file=apps/ZEditor/src/ui/canvas/SelectionTurn.jsx fn=selectionTurnFor,startSelectionTurn
```

**The Logic:**
- `selectionTurnFor` decides whether a knob is needed: only for the Move tool, and for more than one item or a single stroke. `.filter` keeps visible, unlocked, selected items.
- It computes the four edges of the whole selection with `Math.min(...)` and `Math.max(...)` over all the items' bounding boxes (`...bounds.map(...)` spreads a list into separate arguments), and returns the box and its centre `(cx, cy)`.
- `startSelectionTurn` records the pointer's angle at the press (`startAngle`). On each move it computes the **change** in angle (`delta`), optionally snapped to 15°, and asks `onRotateAnnotations` to turn all the items about the centre by it. Using the change, not the absolute angle, means grabbing the knob does not make the items jump.

**Worked example.** You grab the selection's knob when the pointer is at an angle of 10° from the centre, then drag until it is at 55°. `delta = 55 − 10 = 45°`, and every item turns 45° about the shared centre. With Shift: `Math.round(45 / 15) × 15 = 45`; at 50° the delta is 40°, which Shift snaps to 45°. Because only the *change* matters, grabbing the knob at any angle does not make the items jump.

## Intro

"No paper" is a page without a fixed sheet: an **auto-expanding canvas**. You draw anywhere, even past the edge of the first view, and the canvas grows to hold everything. Use it for mood boards, collages and layouts where you do not know the final size yet. Save the project (`.znow`) to keep it.

## How to use

1. *New Document → Paper size → No paper: auto-expanding canvas → Create.* It starts at 800 × 600 pt.
2. Place or draw items near an edge, or outside the canvas on the pasteboard. When you let go of the mouse or finger, the canvas grows on that side.
3. It only grows, never shrinks. Growing left or up does not make anything seem to move.
4. Undo works as usual; the canvas size is part of each undo step.

## How it works

### The rule

Each time you release the mouse, the editor takes the **bounding box** of all items on the page and compares it with the canvas. If an item's edge is within **40 px** of a canvas edge, or past it, the canvas grows on that side until there is **240 px** of free room beyond the content. These two numbers are a **hysteresis**: the trigger is closer than the margin that is added, so the canvas does not grow again after every tiny move.

### Growing left or up: moving the origin

Page coordinates start at the top-left corner. If the canvas grows to the left, the corner moves, so every item is shifted right by the same amount `sx` (and down by `sy` for growth upward). The view is scrolled by the same amount, so on screen nothing seems to have moved. This is a **coordinate shift**, with the scroll compensation applied once by `ComposeCanvas` through a small shared variable (`canvasGrowShift`).

### Not while dragging

Growth waits for the mouse button to come up, so a drag in progress is never disturbed. A window-level `mousedown`/`mouseup` pair sets a "held" flag, and a state counter ticks one beat after release (a `setTimeout` of 0 lets the gesture's last update land first), which re-runs the growth check.

### One undo step

Growing is not an undo step of its own. The page's size and its items' positions are saved together in every undo snapshot, so undoing a move also puts the canvas back.

## Code

The trigger and the margin:

```js file=apps/ZEditor/src/constants.js
export const CANVAS_GROW_TRIGGER_PX = 40; // content this close to the edge (or past it) makes the canvas grow...
export const CANVAS_GROW_MARGIN_PX = 240; // ...until there is this much room beyond the content
```

Work out how far to grow on each side:

```js file=apps/ZEditor/src/state/useCanvasGrow.js
  const left = x0 < T ? Math.min(0, x0 - M) : 0;
  const top = y0 < T ? Math.min(0, y0 - M) : 0;
  const right = x1 > dispW - T ? Math.max(dispW, x1 + M) : dispW;
  const bottom = y1 > dispH - T ? Math.max(dispH, y1 + M) : dispH;
```

Growing left or up shifts every item by the same amount:

```js file=apps/ZEditor/src/state/useCanvasGrow.js
  const annotations = plan.sx || plan.sy ? page.annotations.map((a) => translatedAnnotation(a, plan.sx, plan.sy)) : page.annotations;
```

Waiting until the mouse is released:

```js file=apps/ZEditor/src/state/useCanvasGrow.js
    const up = () => { heldRef.current = false; setTimeout(() => setReleaseTick((t) => t + 1), 0); }; // after the gesture's last update
```

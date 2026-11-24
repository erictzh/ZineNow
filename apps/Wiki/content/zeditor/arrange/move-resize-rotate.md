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

Following the mouse, wherever it goes:

```js file=apps/ZEditor/src/ui/pointer.js
export function trackPointerDrag(onMove, onUp) {
  const move = (ev) => onMove(ev);
  const up = (ev) => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    if (onUp) onUp(ev);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}
```

The pointer's movement in the item's own axes:

```js file=apps/ZEditor/src/ui/pointer.js
    const [dx, dy] = rotatePoint((ev.clientX - startX) / zoom, (ev.clientY - startY) / zoom, -angle);
```

Resizing: which sides a handle moves, and keeping the anchor in place:

```js file=apps/ZEditor/src/model/geometry.js
  const signX = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const signY = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
```

```js file=apps/ZEditor/src/model/geometry.js
  const centerX = box.x + box.width / 2 + oldOffsetX - newOffsetX;
  const centerY = box.y + box.height / 2 + oldOffsetY - newOffsetY;
```

Rotating towards the pointer, with the 15° snap:

```js file=apps/ZEditor/src/ui/canvas/ResizeHandles.jsx
    let degrees = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI + 90;
    degrees = ev.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
    onRotate(((degrees % 360) + 360) % 360);
```

Rotating a whole selection by the change in angle:

```js file=apps/ZEditor/src/ui/canvas/SelectionTurn.jsx
      let delta = pointerAngle(ev) - startAngle;
      delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
      onRotateAnnotations(items, delta, cx, cy);
```

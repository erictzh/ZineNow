## Intro

Ruler Guide gives you **rulers** along the top and left of the page, and **guides**: thin cyan lines you pull out of the rulers to line things up, like in Photoshop. Items you move can snap onto the guides, and a lock freezes them so you do not drag one by accident. Guides are only for the editor; they never print or export.

## How to use

Open **Page menu → Ruler Guide**. The switch turns the rulers on or off; the ▸ arrow opens its settings.

- **Add a guide:** press on the top ruler and drag down for a horizontal line, or on the left ruler and drag right for a vertical one.
- **Move a guide:** drag it. Drag it back onto its ruler, or off the canvas, to remove it (it turns red and says "Remove guide").
- **Land on whole units:** hold **Shift** while dragging (1 mm, 0.1 cm, 1/8 in or 1 pt, depending on the unit).
- **Fine steps:** move the pointer slowly. The slower you move, the less the guide follows you.
- **Units:** millimetres, centimetres, inches or points.
- **Snap items to guides:** on by default. Drag an item near a guide and its edge or middle jumps onto it. Hold **Alt** to move freely.
- **Lock guides:** freezes every guide. You can no longer drag, add or remove them, "Clear all guides" is greyed out, and clicks pass through the lines to the page.
- **Hover a ruler:** the gap between the two guides around the pointer is shown as a number.

> **Tip** Guides are saved with the project (`.znow`) and show on every page.

## How it works

### One coordinate system: points from the top-left corner

A guide is just `{ id, axis, pos }`. Axis `"x"` is a vertical line at `x = pos`, axis `"y"` a horizontal line at `y = pos`. `pos` is in **points** (1/72 inch) counted from the page's top-left corner. Storing points, not screen pixels, is why a guide stays on the same spot of the paper whatever the zoom. The ruler only converts to millimetres or inches when it draws a number.

### Drawing the ticks: a 1-2-5 sequence

The ruler has to decide which numbers to print. It builds the list of "nice" steps 1, 2, 5, 10, 20, 50… (that is the standard **1-2-5 series** used on rulers and chart axes) and picks the smallest step that leaves at least 48 screen pixels between two labels. So zooming in gives you finer numbers, zooming out coarser ones. Each numbered step is then cut into smaller ticks, but only while those ticks stay at least 4 pixels apart, so the ruler never turns into a solid bar.

### Precision dragging: speed-dependent gain

When you drag a guide it does not follow the pointer one to one. The pointer's speed is measured (pixels per millisecond, smoothed so it reacts at once), and the guide moves by `movement × gain`. The gain is 1 at a normal pace and falls to 0.1 when you crawl. That is why slow movements give fine steps: a technique known as **control-display gain** (the same idea as mouse acceleration, here used in reverse for fine work).

### Snapping: nearest edge within a threshold

When you move items, the box around them has three interesting positions per axis: left edge, middle, right edge (top, middle, bottom on the other axis). The code checks every box position against every guide, takes the closest pair, and if it is within 6 screen pixels it nudges the box by exactly that distance. Because the threshold is divided by the zoom, it feels the same size on screen at any zoom. The Measure tool uses the same function for single points.

> **Why** The threshold is in screen pixels, not points, because "close" is something your eye judges. A fixed point distance would be huge when zoomed out and impossible to hit when zoomed in.

### Lock

Locking is a flag, `guidesLocked`, kept with the other view settings. The ruler's drag code returns immediately when it is set, the lines get an `is-locked` class (CSS `pointer-events: none`), and the clear button is disabled. Snapping still works while locked, because snapping reads the guides but never changes them.

## Code

The ruler tick spacing, from `rulerTicks`:

```js file=apps/ZEditor/src/model/rulers.js
  for (let e = -3; e <= 5; e++) for (const m of [1, 2, 5]) steps.push(m * 10 ** e);
  const major = steps.find((s) => s * pxPerUnit >= minLabelPx) || steps[steps.length - 1];
```

The drag gain: 1 at a normal pace, down to 0.1 when crawling.

```js file=apps/ZEditor/src/model/rulers.js
export function dragGain(speedPxPerMs) {
  const FAST = 0.5, SLOW_GAIN = 0.1;
  return Math.max(SLOW_GAIN, Math.min(1, speedPxPerMs / FAST));
}
```

How a drag uses it (the speed is smoothed 70% latest, 30% before):

```js file=apps/ZEditor/src/ui/canvas/Rulers.jsx
    const follow = (ev) => {
      const c = coord(ev), dt = Math.max(1, ev.timeStamp - last.t);
      speed = speed * 0.3 + (Math.abs(c - last.c) / dt) * 0.7;
      raw += ((c - last.c) * dragGain(speed)) / pxPerPt;
      last = { c, t: ev.timeStamp };
    };
```

Snapping a box onto the closest guide:

```js file=apps/ZEditor/src/model/rulers.js
export function snapToGuides(box, guides, threshold) {
  const nearest = (edges, lines) => {
    let best = 0, bestDist = threshold;
    for (const edge of edges) for (const line of lines) {
      const d = Math.abs(line - edge);
      if (d <= bestDist) { bestDist = d; best = line - edge; }
    }
    return best;
  };
```

Where moving an item calls it (Alt skips it, `SNAP_PX / zoom` keeps the feel constant):

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
      if (moved && startBox && !ev.altKey) { // Alt moves freely
        const snap = snapToGuides({ x0: startBox.x0 + dx, y0: startBox.y0 + dy, x1: startBox.x1 + dx, y1: startBox.y1 + dy }, guideLines, SNAP_PX / zoom);
        dx += snap.dx; dy += snap.dy;
      }
```

The lock, and how it is saved with the project:

```js file=apps/ZEditor/src/ui/canvas/Rulers.jsx
    if (locked) return; // frozen guides: nothing to drag, add or remove
```

```js file=apps/ZEditor/src/state/useViewSettings.js
      rulersOn, rulerUnit, rulerGuides, snapToGuidesOn, guidesLocked,
```

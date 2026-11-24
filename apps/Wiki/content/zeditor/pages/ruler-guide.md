## Intro

Ruler Guide gives you **rulers** along the top and left of the page, and **guides**: thin cyan lines you pull out of the rulers to line things up, like in Photoshop. Items you move can snap onto the guides, and a lock freezes them so you do not drag one by accident. Guides are only for the editor; they never print or export.

## How to use

Open **Page menu → Ruler Guide**. The switch turns the rulers on or off; **Customize…** next to it opens its settings.

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

Below is the real code, copied from the repository when the wiki is built. The grey numbers on the left are the file's own **line numbers**, and the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes some inputs (its **parameters**, in the brackets after its name), does some work, and gives back a result with `return`.

### `rulerTicks`: where the ruler's marks go

It decides which positions get a tick, and which of those get a number.

```js file=apps/ZEditor/src/model/rulers.js fn=rulerTicks
```

**The Logic:**
- `fromPt`, `toPt` are the visible part of the page, `pxPerPt` is the zoom (screen pixels per point) and `unit` is mm, cm, in or pt. `minLabelPx = 48` is a **default value**: used when the caller gives none.
- `const` makes a **variable** that is never reassigned. `perPt` is how many ruler units fit in one point, `pxPerUnit` how many screen pixels one unit takes.
- `steps` is an **array** (an ordered list). The nested `for` **loops** build the 1-2-5 series: for each power of ten `e` from −3 to 5, the numbers 1, 2 and 5 times `10 ** e` (`**` is "to the power of"). That gives …, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, ….
- `steps.find(...)` goes through the list and returns the first step whose width on screen (`s * pxPerUnit`) is at least `minLabelPx`. That is the numbered step. `|| steps[...]` is the fallback if none is wide enough.
- `splits` lists how many smaller ticks the numbered step can be cut into, keeping only splits where one small tick is still at least 4 px wide (`.filter(...)`, which keeps the array items for which the test is true).
- The final `for` visits every small tick from `start` to `end`. `Math.floor` and `Math.ceil` round down and up, so the ticks cover the whole visible range. `if (end - start > 5000) return ticks;` is a safety valve: never draw an absurd number of ticks.
- Inside the loop, `onMajor` and `onMid` ask "does this tick land on a whole numbered step (or exactly half of one)?", using a tiny tolerance `1e-6` because computers cannot store most decimals exactly (**floating-point error**). Each tick is pushed into `ticks` as a small **object** `{ pt, value, size }`.

### `dragGain`: slower hand, finer steps

```js file=apps/ZEditor/src/model/rulers.js fn=dragGain
```

**The Logic:**
- It receives the pointer's speed in pixels per millisecond.
- `Math.min(1, speed / FAST)` scales the speed to a number from 0 to 1 (never above 1), `Math.max(SLOW_GAIN, ...)` makes sure it never drops below 0.1. So the **gain** is 1 at 0.5 px/ms or faster, and 0.1 when the pointer crawls. Min and max used together like this are called **clamping**.

### `follow`: moving the guide by speed-scaled steps

It lives inside `startDrag` (a function inside a function), so it can use that function's variables.

```js file=apps/ZEditor/src/ui/canvas/Rulers.jsx fn=follow
```

**The Logic:**
- It runs on every `mousemove` while you drag. `c` is the pointer's position on the relevant axis, `dt` the time since the last move (at least 1 ms, to avoid dividing by zero).
- `speed = speed * 0.3 + (distance / dt) * 0.7` is an **exponential moving average**: a weighted mix of the old speed (30%) and the newest (70%). It smooths jitter but still reacts at once.
- `raw += (movement × gain) / pxPerPt` adds the scaled movement, converted from screen pixels to points (`+=` means "add to"). `raw` is the guide's unrounded position.
- `last = {...}` remembers this move for the next one.

### `snapToGuides`: pull a box onto the nearest guide

```js file=apps/ZEditor/src/model/rulers.js fn=snapToGuides
```

**The Logic:**
- `box` is where the moved items would be; `guides` holds the guide positions per axis; `threshold` is how close counts.
- `nearest` is a function stored in a variable: given a few edge positions and a few guide positions, it tries every pair (a loop inside a loop). `Math.abs` gives the distance regardless of direction. If a pair is closer than the best so far (`d <= bestDist`), it remembers the **signed** move needed, `line - edge`.
- `bestDist` starts at the threshold, so nothing farther than that is ever chosen. If nothing qualifies, `best` stays `0`: no move.
- The `return` runs it twice, once for the horizontal axis with the box's left, middle and right edges, once for the vertical axis. `(box.x0 + box.x1) / 2` is the middle. `guides.x || []` means "use an empty list if there are no guides".

### `guideLinesPx`: converting points to page pixels

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx fn=guideLinesPx
```

**The Logic:**
- Guides are stored in points; items live in page pixels, `MAIN_SCALE` (1.1) times larger. This function multiplies each guide by it.
- `snapGuides && snapGuides.length ? {...} : null` is a **ternary**: "if there are guides, give this object, otherwise give null". `snapGuides` itself is `null` when the Snap switch is off, so switching it off needs no other code.
- `.filter(...)` keeps the guides of one axis, `.map(...)` turns each into its pixel position.

### Where moving an item uses it

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
      if (moved && startBox && !ev.altKey) { // Alt moves freely
        const snap = snapToGuides({ x0: startBox.x0 + dx, y0: startBox.y0 + dy, x1: startBox.x1 + dx, y1: startBox.y1 + dy }, guideLines, SNAP_PX / zoom);
        dx += snap.dx; dy += snap.dy;
      }
```

**The Logic:** this sits inside the drag handler. `dx`, `dy` is how far the pointer has moved. The box is moved by that much, handed to `snapToGuides`, and the nudge it answers with is added on. `!ev.altKey` means "unless Alt is held". `SNAP_PX / zoom` converts the 6 *screen* pixels into page pixels.

### The lock and the saved settings

```js file=apps/ZEditor/src/ui/canvas/Rulers.jsx
    if (locked) return; // frozen guides: nothing to drag, add or remove
```

The first line of `startDrag`: if the guides are locked, the function ends at once, so nothing can be dragged, added or removed.

```js file=apps/ZEditor/src/state/useViewSettings.js fn=settingsForSave
```

`settingsForSave` builds the **object** that is written into the `.znow` file. Listing `guidesLocked` here is the whole reason the lock is remembered with the project.

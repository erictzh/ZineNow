## Intro

You can zoom the page from **10% to 600%**. The page sits on a larger **outer canvas** (a pasteboard around it), so you can park items beside the paper, and zooming always keeps the spot you care about in place instead of jumping to a corner.

## How to use

- **Zoom box** in the toolbar: type a percentage, or use its − and + buttons.
- **Ctrl +** and **Ctrl −** step through fixed levels (10, 15, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500, 600). **Ctrl 0** returns to 100%.
- **Ctrl + mouse wheel** zooms at the pointer. On a laptop, a two-finger pinch on the touchpad arrives as the same thing.
- **On a touch screen:** pinch with two fingers. Moving both fingers also scrolls.
- A document you create or open always starts at **100%** with the page centred.
- Zooming only takes over the browser's zoom while the pointer is over the page area. Over the panels, the browser zooms as usual.

## How it works

### Zoom around an anchor

If you only changed a number, the page would grow from its top-left corner and what you were looking at would slide away. So every zoom picks an **anchor**: a point of the page (in 100%-zoom pixels) and the place in the view where it should stay. Before the zoom, the code records the page point under the anchor; after the page has been laid out at the new size, a layout effect scrolls the pane so that same page point is back under the same screen spot.

The anchor is chosen by how you zoomed:

| How | Anchor |
|---|---|
| Zoom box, Ctrl + / − | the middle of the view |
| Ctrl + wheel | the pointer |
| Pinch | the midpoint between the two fingers |

For a pinch the maths is a pure ratio: the zoom is `startPercent × scale`, where `scale` is how much the fingers' distance has grown since they landed.

### Smooth wheel zoom: exponential steps

A wheel or touchpad delivers many small steps. The zoom multiplies by `e^(−delta × 0.008)` per event, an **exponential** zoom, so that every notch changes the size by the same *percentage* (about 22% per mouse notch) however zoomed in you already are, and many tiny pinch steps add up smoothly. The unrounded value is kept separately, so tiny steps are not lost to rounding. If the wheel fires faster than the page can redraw, the anchor first asked for is kept, so the picture does not drift.

### The pinch gate

Two fingers panning a page never keep a perfectly constant gap, and treating that drift as a pinch made the zoom wobble. `createPinchGate` (shared by all three apps) returns exactly 1 until the gap between the fingers has grown or shrunk by **30%**, so it is a plain two-finger scroll. Once it starts zooming it measures from the gap *at that moment* (`rawScale / base`), so the zoom picks up smoothly instead of jumping by the threshold. The 30% was found on a real tablet: 15% and 25% still wobbled.

### The outer canvas

The page is not the whole scrollable area: the **pasteboard** around it is half a view wide on every side (styles in `layout.css`), so you can draw or park items outside the paper. When a page opens, `centerArtboard` scrolls the pane so the page is in the middle, or, for a page taller than the view, puts its top 40 px below the top edge. Without it the view would start in a corner of the pasteboard.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Keeping the spot under your eyes

```js file=apps/ZEditor/src/state/useZoom.js fn=scrollPointTo
```

**The Logic:** the pane is a scrollable area; `scrollLeft`/`scrollTop` say how far it is scrolled. A page point `(x, y)` at the new zoom sits at `x × percent` pixels from the page's own corner, plus the page's offset in the pane (`board.offsetLeft`). To put it back at screen position `(fx, fy)`, scroll by that sum minus `fx`. The anchor idea is simply: *remember the page point, zoom, then scroll so it is under the same screen spot*.

### `zoomAt`: one zoom request

```js file=apps/ZEditor/src/state/useZoom.js fn=zoomAt
```

**The Logic:**
- `Math.min(max, Math.max(min, raw))` **clamps** the request to 10–600%. The unrounded value is kept in `floatRef` so tiny touchpad steps add up; `Math.round` makes the whole percentage shown.
- If the rounded value equals the zoom already asked for, it returns early (`return`) and does nothing.
- `waiting` is the anchor from a still-undrawn zoom: if wheel events arrive faster than the page can redraw, the *first* anchor is kept (`waiting ? { x: waiting.x, y: waiting.y } : pagePointAt(fx, fy)`), so the picture does not drift. `...` (the **spread** operator) copies an object's fields into a new one.
- Finally `setZoomPercent(percent)` changes the state; React redraws, and the layout effect shown above scrolls back to the anchor.

### `zoomStep`: Ctrl+ and Ctrl−

```js file=apps/ZEditor/src/state/useZoom.js fn=zoomStep
```

**The Logic:** `ZOOM_STEPS.find((s) => s > current)` is the first listed zoom bigger than now; for zooming out, `[...ZOOM_STEPS].reverse().find((s) => s < current)` copies the list, reverses it, and finds the first smaller one. If there is none, the limit is used.

### The mouse wheel

```js file=apps/ZEditor/src/state/useZoom.js fn=onWheel
```

**The Logic:**
- It only reacts when Ctrl or Cmd is held (`e.ctrlKey || e.metaKey`) and the pointer is over the page area (`closest(".ze-ruler-frame")`).
- `e.preventDefault()` stops the browser zooming the whole window. That is why the listener is registered with `{ passive: false }`: browsers treat wheel listeners as "will never cancel" for speed unless told otherwise.
- `deltaMode` says whether the wheel reports pixels, lines or pages; the code converts to pixels.
- The last line is the **exponential zoom**: `Math.exp(-pixels * 0.008)` is `e` raised to a small negative or positive number, a factor just above or below 1 that multiplies the current zoom. Scrolling up gives a factor above 1 (zoom in). `Math.max(-25, Math.min(25, pixels))` caps how much one notch can do.

### Centring the page

```js file=apps/ZEditor/src/state/useZoom.js fn=centerArtboard
```

**The Logic:** the **artboard** is the page element. To centre it, scroll to its middle minus half the pane (`board.offsetLeft + w / 2 - pane.clientWidth / 2`). Vertically, if the page plus a 40 px gap fits in the pane it is centred too; otherwise its top is placed 40 px below the pane's top edge, so a tall page starts at its top.

### The pinch gate

```js file=shared/js/pinchGate.js fn=createPinchGate
```

**The Logic:**
- `createPinchGate` makes and returns a new function, `gate`, which **remembers** `base` between calls. This is a **closure**: an inner function that keeps the variables of the function that made it.
- `rawScale` is the fingers' gap now divided by the gap when they landed (1 = unchanged). `Math.log(rawScale)` is the natural logarithm: it turns "twice as big" and "half as big" into numbers of equal size and opposite sign (+0.69, −0.69), so shrinking and growing are judged by the same rule: `Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)`.
- While the change is below 30% it returns exactly `1`: no zoom. The first time it is above, it saves `base = rawScale`, and from then on returns `rawScale / base`: zoom measured from that moment.

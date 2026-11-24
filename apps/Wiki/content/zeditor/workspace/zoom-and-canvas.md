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

**Worked example.** The pane is scrolled 50 px, the board (page) starts 100 px from the pane's left edge, and the anchor is the middle of the view at `fx = 400`. The zoom is 100%.
1. Before zooming: `point.x = (50 + 400 − 100) / 100 = 3.5` (page pixels per percent of zoom).
2. The zoom becomes 200%. After the page is redrawn, `scrollPointTo` sets `scrollLeft = 3.5 × 200 + 100 − 400 = 400`.
3. Check: the anchor is now 700 px from the page's left edge (3.5 × 200), the page starts 100 px into the pane, and the pane is scrolled 400, so it appears at 100 + 700 − 400 = **400**: exactly where `fx` was. The spot you were looking at did not move.

### `zoomAt`: one zoom request

```js file=apps/ZEditor/src/state/useZoom.js fn=zoomAt
```

**The Logic:**
- `Math.min(max, Math.max(min, raw))` **clamps** the request to 10–600%. The unrounded value is kept in `floatRef` so tiny touchpad steps add up; `Math.round` makes the whole percentage shown.
- If the rounded value equals the zoom already asked for, it returns early (`return`) and does nothing.
- `waiting` is the anchor from a still-undrawn zoom: if wheel events arrive faster than the page can redraw, the *first* anchor is kept (`waiting ? { x: waiting.x, y: waiting.y } : pagePointAt(fx, fy)`), so the picture does not drift. `...` (the **spread** operator) copies an object's fields into a new one.
- Finally `setZoomPercent(percent)` changes the state; React redraws, and the layout effect shown above scrolls back to the anchor.

**Worked example.** The wheel gives `deltaY = 100` (one notch) with the zoom at 100%.
1. In the wheel handler the pixel amount is clamped to ±25 (`Math.max(-25, Math.min(25, 100))` = 25). The factor is `e^(−25 × 0.008) = e^(−0.2) = 0.819`, so `raw = 100 × 0.819 = 81.9`.
2. `zoomAt` clamps to 10–600 (81.9 is fine), keeps `floatRef = 81.9` and uses `percent = Math.round(81.9) = 82`.
3. The box shows 82%. The next notch starts from the unrounded 81.9, not from 82, so tiny touchpad steps (say `deltaY = 3`: factor 0.976) are never lost to rounding.
4. Scrolling the other way: `deltaY = −100` gives `e^(+0.2) = 1.221`, about 22% bigger per notch.

### `zoomStep`: Ctrl+ and Ctrl−

```js file=apps/ZEditor/src/state/useZoom.js fn=zoomStep
```

**The Logic:** `ZOOM_STEPS.find((s) => s > current)` is the first listed zoom bigger than now; for zooming out, `[...ZOOM_STEPS].reverse().find((s) => s < current)` copies the list, reverses it, and finds the first smaller one. If there is none, the limit is used.

**Worked example.** The steps are 10, 15, 25, 33, 50, 67, 75, 90, 100, 110, 125 ….
- At 100%, Ctrl+ finds the first step above 100: **110**. Ctrl− reverses the list and finds the first step below 100: **90**.
- At 105% (possible after a wheel zoom), Ctrl+ gives 110 and Ctrl− gives 100.
- At 600% (the top), no step is above, so `.find` returns nothing and `ZOOM_PERCENT.max` (600) is used.

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

**Worked example.** The pane is 1000 × 700 px. The page is 400 × 600 px and starts 300 px from the pane's left and 200 px from its top.
- `scrollLeft = 300 + 400 / 2 − 1000 / 2 = 0`: the page is already centred horizontally.
- The page is 600 px tall; 600 + 2 × 40 = 680 ≤ 700, so it fits: `scrollTop = 200 + 600 / 2 − 700 / 2 = 150`.
- If the page were 900 px tall: 900 + 80 = 980 > 700, so it does not fit and `scrollTop = 200 − 40 = 160`: the page's top edge is 40 px below the top of the pane.

### The pinch gate

```js file=shared/js/pinchGate.js fn=createPinchGate
```

**The Logic:**
- `createPinchGate` makes and returns a new function, `gate`, which **remembers** `base` between calls. This is a **closure**: an inner function that keeps the variables of the function that made it.
- `rawScale` is the fingers' gap now divided by the gap when they landed (1 = unchanged). `Math.log(rawScale)` is the natural logarithm: it turns "twice as big" and "half as big" into numbers of equal size and opposite sign (+0.69, −0.69), so shrinking and growing are judged by the same rule: `Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)`.
- While the change is below 30% it returns exactly `1`: no zoom. The first time it is above, it saves `base = rawScale`, and from then on returns `rawScale / base`: zoom measured from that moment.

**Worked example.** `threshold = 0.3`. Two fingers land 200 px apart.
1. They drift to 240 px: `rawScale = 1.2`. `|ln 1.2| = 0.18`, and `ln(1.3) = 0.26`. 0.18 < 0.26, so the gate returns **1**: still just a scroll.
2. They reach 280 px: `rawScale = 1.4`, `|ln 1.4| = 0.34 > 0.26`. The gate wakes up: `base = 1.4`, and it returns 1.4 / 1.4 = **1**. The zoom has "started", but has not jumped.
3. They reach 350 px: `rawScale = 1.75`, so the gate returns 1.75 / 1.4 = **1.25**: the zoom is 125% of what it was when the fingers landed.
4. Pinching *in* works the same way: 140 px gives `rawScale = 0.7`, and `|ln 0.7| = 0.36 > 0.26`, so it wakes up. The logarithm treats a 30% shrink and a 30% growth fairly.

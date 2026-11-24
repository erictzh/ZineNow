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

The zoom limits and the keyboard steps:

```js file=apps/ZEditor/src/constants.js
export const ZOOM_PERCENT = { min: 10, max: 600, initial: 100 };
```

```js file=apps/ZEditor/src/state/useZoom.js
const ZOOM_STEPS = [10, 15, 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500, 600];
```

Keep the anchor in place after the zoom has been drawn:

```js file=apps/ZEditor/src/state/useZoom.js
  function scrollPointTo(point, fx, fy, percent) {
    const pane = previewPaneRef.current, board = artboardElement();
    pane.scrollLeft = point.x * percent + board.offsetLeft - fx;
    pane.scrollTop = point.y * percent + board.offsetTop - fy;
  }
```

The exponential wheel zoom:

```js file=apps/ZEditor/src/state/useZoom.js
      zoomAt(floatRef.current * Math.exp(-Math.max(-25, Math.min(25, pixels)) * 0.008), fx, fy);
```

Pinch: the zoom is the starting zoom times the fingers' spread, clamped to the limits:

```js file=apps/ZEditor/src/state/useZoom.js
      const percent = Math.round(Math.min(ZOOM_PERCENT.max, Math.max(ZOOM_PERCENT.min, pinch.startPercent * pinch.gate(scale))));
```

Centring a page when it opens:

```js file=apps/ZEditor/src/state/useZoom.js
  pane.scrollTop = h + 2 * TOP_GAP <= pane.clientHeight
    ? board.offsetTop + h / 2 - pane.clientHeight / 2
    : board.offsetTop - TOP_GAP;
```

The pinch gate itself (shared):

```js file=shared/js/pinchGate.js
      if (!(rawScale > 0) || Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)) return 1;
      base = rawScale;
    }
    return rawScale / base;
```

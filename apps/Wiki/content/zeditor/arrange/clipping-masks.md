## Intro

A **clipping mask** shows a layer **only where the layer below it has pixels**. Put a photo on top of a text box or a shape and clip it: the photo now shows only inside the letters or the shape. Any layer kind can be clipped (image, text, shape, stroke), and any kind can be what it is clipped to.

## How to use

- Select a layer and press **Ctrl+Alt+G**, or use **Clip to layer below** in its ⋮ menu in the Layers panel. A small arrow shows next to a clipped layer.
- Click that arrow, or choose **Release clipping mask**, to undo it.
- **Several layers:** select them all and use **Clip to below (multiple)**. The bottom-most selected layer stays as the **base** and every other selected layer above it is clipped to it.
- Several clipped layers in a row all clip to the **same base**: the nearest layer below that is not itself clipped.
- Move or resize the clipped layer freely; the mask stays with the base.
- On a touch screen, the touch bar has a Clipping mask button.

## How it works

### The rule, as data

A clipped layer simply carries `clipToBelow: true`. Which layer it is clipped to is not stored: it is computed. `clipBaseIndex` walks down the stack from the item and returns the first layer that is not itself clipped. If there is none (the item is at the bottom, or only clipped layers lie below it), the flag is ignored and the layer draws normally. Hiding the base hides everything clipped to it.

### Masking with the alpha channel

Drawing a clipped item takes three steps on a page-sized canvas:
1. Draw the item on its own blank **layer** canvas.
2. Set `globalCompositeOperation = "destination-in"`, then draw the **mask** (the base's shape) on top. `destination-in` keeps the existing pixels only where the new drawing has pixels, scaled by its alpha. So the item survives exactly where the mask is opaque.
3. Draw the result onto the page with the item's own blend mode.

This is **alpha compositing** (the Porter-Duff "in" operator). The mask is the base's **shape alone**: its edge shape, rotation and crop count, but its stroke, shadow, texture, opacity and filter do not, so the mask is at full strength even if the base is faint.

### In the live editor

The editor cannot redraw canvases on every mouse move, so `ClipWrap` uses the browser's **CSS mask**: the base's shape is rendered once into a picture (a blob URL used as `mask-image`), and the clipped item sits inside a wrapper with that mask. Moving or resizing the *clipped* layer never redraws the mask. Only a change to the *base's shape* does, and the old mask stays visible until the new one is ready, so nothing flashes.

Details that keep it cheap and correct:
- The mask is a picture at up to **2×** the page's pixels, and capped at 16 million pixels, so a huge base cannot use unlimited memory.
- A "signature" of the base decides when to redraw. Large pictures inside it are summarised as their length plus the last 48 characters, not compared whole.
- The mask covers the base's own bounds plus 3 px for its smooth edge, and these may reach past the page onto the outer canvas.
- Until the mask is ready the wrapper is `visibility: hidden`, so the image never flashes unclipped.

> **Why** One shared function, `clipMaskCanvas`, makes the mask for both the live editor and the export, so the clipped result is identical on screen and in the PDF.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `clipBaseIndex`: what is this layer clipped to?

```js file=apps/ZEditor/src/model/clipping.js fn=clipBaseIndex
```

**The Logic:** it starts just below the layer (`index - 1`) and walks **down** the stack (`i--` means "subtract one" each round). The first layer that is not itself clipped is the base; `return i` ends the function with it. If the loop finishes without finding one, `-1` is returned: by convention, "no such position".

**Worked example.** The stack, bottom first: [0: photo, 1: shape, 2: texture (clipped), 3: sticker (clipped)].
- For the sticker (`index = 3`): `i = 2` is the texture, which is clipped, so skip; `i = 1` is the shape, which is not clipped: **base = 1**. Both texture and sticker are clipped to the shape.
- For the photo (`index = 0`): the loop does not run at all: **−1**, "no base", so it would be drawn normally.
- For the shape (`index = 1`): `i = 0`, the photo: base 0, if you clipped it.

### `canClipAt` and `clipTargets`

```js file=apps/ZEditor/src/model/clipping.js fn=canClipAt,clipTargets
```

**The Logic:**
- `canClipAt` is true if the layer exists (`Boolean(items[index])`) and a base exists (`clipBaseIndex(...) >= 0`).
- `clipTargets` turns the selected ids into rows: `items.map((a, i) => ids.includes(a.id) ? i : -1)` gives the position or −1, and `.filter((i) => i >= 0)` drops the −1s. If several are selected, `rows.slice(1)` skips the first (the lowest), which stays as the base; otherwise the one layer itself is the candidate. A final `.filter` keeps those not already clipped and able to be, and `.map` turns positions back into ids.

**Worked example.** Items [A, B, C, D], none clipped yet.
- Select only C: `rows = [2]`, one row, so `candidates = [2]`; C is not clipped and `canClipAt(…, 2)` is true (base B): result `[C]`.
- Select B, C and D: `rows = [1, 2, 3]`, several, so `rows.slice(1) = [2, 3]`: B stays as the base, C and D are clipped. When drawn, D's base is the nearest layer below it that is not clipped, which is B (C is clipped).
- Select **B and D only** (C between them): `candidates = [3]`; D is clipped, but its base is the nearest unclipped layer below it, which is **C**, not B. The base is always the nearest, not the "bottom-most selected".
- Select only A (the bottom): `canClipAt(…, 0)` is false (nothing below): nothing happens.

### `maskShapeOf`: only the shape counts

```js file=apps/ZEditor/src/render/clipMask.js fn=maskShapeOf
```

**The Logic:** `{ ...base, opacity: undefined, ... }` copies the base item but cancels its opacity, blend mode, hidden flag and filter; `filter: { type: "none" }` turns filtering off. The loop sets every property of the stroke, shadow, texture and text-label effects to `undefined`, so the mask is the bare silhouette, fully opaque.

**Worked example.** The base is a photo at 50% opacity, with a drop shadow, a 10° rotation and a torn-edge shape. The mask keeps the torn edge, the rotation and the crop, but has its opacity, blend mode and filter cancelled, and its shadow, stroke and texture properties set to `undefined`. Result: a fully opaque, rotated, torn-edged silhouette. Even if the base is nearly invisible, whatever is clipped to it shows at full strength inside that silhouette.

### `drawClippedItem`: cut with the alpha channel

```js file=apps/ZEditor/src/render/clipMask.js fn=drawClippedItem
```

**The Logic:**
- `newCanvas` makes an off-screen canvas the size of the page. The item is drawn on it **alone** (`layer`), with no blend mode yet.
- `layerCtx.globalCompositeOperation = "destination-in"` changes how the next drawing combines with what is there: **destination-in** keeps the existing pixels only where the new drawing has pixels. Drawing the mask now therefore erases the item everywhere the mask is empty. This is the **Porter-Duff "in"** operation from alpha compositing.
- `ctx.save()` / `ctx.restore()` bracket the final step so the blend mode set there does not stay on. The finished layer is drawn onto the page with the item's own blend mode (`blendOf(item)`), if it is not "normal".

**Worked example.** The item is a photo (alpha 255 everywhere). The mask is a circle: alpha 255 inside, 0 outside, and 128 on a pixel at the soft edge. `destination-in` multiplies the existing alpha by the new drawing's alpha ÷ 255:
- a pixel inside the circle: 255 × 255 / 255 = **255**: kept;
- a pixel outside: 255 × 0 / 255 = **0**: gone;
- an edge pixel: 255 × 128 / 255 = **128**: half see-through, which gives the clipped picture a smooth edge.

### `drawPageItem`: the rule for any item

```js file=apps/ZEditor/src/render/clipMask.js fn=drawPageItem
```

**The Logic:** hidden items return at once. For a clipped item it looks up the base; if a base exists and is visible, `drawClippedItem` draws it; if the base is hidden, the item is not drawn at all (the `return` is reached without drawing); a clipped item with no base falls through to the ordinary `drawAnnotationOnCanvas` at the bottom.

### In the live editor: the mask region and the signature

```js file=apps/ZEditor/src/ui/canvas/ClipWrap.jsx fn=maskRegion,shapeSignature
```

**The Logic:**
- `maskRegion` takes the base's bounds and grows them by 3 px (`EDGE_PAD`) for its anti-aliased edge, rounding outward (`Math.floor` for the start, `Math.ceil` for the end), with at least 1 px in size (`Math.max(1, ...)`).
- `shapeSignature` writes the base out as text (`JSON.stringify`) so two versions can be compared by a simple `===`. Pictures inside it can be megabytes long, so they are replaced by their length plus their last 48 characters: a cheap fingerprint. When the signature changes, the mask is redrawn; when only the *clipped* item moves, it does not.

**Worked example.** The base's bounds are `x = 10.4, y = 20.2, width = 100, height = 50`.
- `x = floor(10.4 − 3) = 7`, `y = floor(20.2 − 3) = 17`.
- `width = ceil(10.4 + 100 + 3) − 7 = ceil(113.4) − 7 = 114 − 7 = 107`; `height = ceil(20.2 + 50 + 3) − 17 = 74 − 17 = 57`.
- The mask picture is made at `Math.min(2, sqrt(16 000 000 / (107 × 57))) = Math.min(2, 51) = 2` times: **214 × 114 pixels**. A base covering 5000 × 5000 px would get `sqrt(16e6 / 25e6) = 0.8`, a scale below 1, to keep the mask under 16 million pixels.
- A base picture whose `src` text is 1 200 000 characters long is summarised as `"1200000:" + the last 48 characters`: a short fingerprint instead of a megabyte comparison.

### The wrapper that applies the mask

```js file=apps/ZEditor/src/ui/canvas/ClipWrap.jsx fn=ClipWrap
```

**The Logic:**
- `useEffect(..., [signature])` makes a new mask only when the base's signature changes. `Math.sqrt(MASK_MAX_PIXELS / area)` reduces the mask's scale for a huge base so it never exceeds 16 million pixels.
- `clipMaskCanvas(...)` returns a **promise** (a result that arrives later); `.then((canvas) => ...)` runs when it is ready. `canvas.toBlob` encodes it as a PNG file in memory, and `URL.createObjectURL(blob)` makes a temporary address for it, usable as a CSS image.
- `cancelled` guards against a late result for an outdated base. The old address is released with `URL.revokeObjectURL` one second later, after the new mask has been painted, so memory is freed without a flash.
- The returned JSX is a `<div>` whose CSS `maskImage` is that address: the browser shows the content only where the mask picture is opaque. `visibility: "hidden"` until the mask exists prevents a flash of the unclipped image. The inner `<div>` shifted by `-region.x`, `-region.y` keeps the content in the page's own coordinates.

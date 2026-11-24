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

Finding what a layer is clipped to:

```js file=apps/ZEditor/src/model/clipping.js
export function clipBaseIndex(items, index) {
  for (let i = index - 1; i >= 0; i--) {
    if (!isClipped(items[i])) return i;
  }
  return -1;
}
```

Several layers at once: the bottom-most stays as the base.

```js file=apps/ZEditor/src/model/clipping.js
  const candidates = rows.length > 1 ? rows.slice(1) : rows;
  return candidates.filter((i) => !isClipped(items[i]) && canClipAt(items, i)).map((i) => items[i].id);
```

Cutting a layer to the mask with the alpha channel:

```js file=apps/ZEditor/src/render/clipMask.js
  await drawAnnotationOnCanvas(layerCtx, { ...item, blend: undefined }, scaleFactor, pageFilter);
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(await clipMaskCanvas(base, width, height, scaleFactor, pageFilter), 0, 0);
```

The mask is only the base's shape: no stroke, shadow, texture, opacity or filter.

```js file=apps/ZEditor/src/render/clipMask.js
export function maskShapeOf(base) {
  const shape = { ...base, opacity: undefined, blend: undefined, hidden: undefined, filter: { type: "none" } };
  for (const prop of NOT_SHAPE_PROPS) shape[prop] = undefined;
  return shape;
}
```

In the editor: the CSS mask, and no flash before it is ready:

```js file=apps/ZEditor/src/ui/canvas/ClipWrap.jsx
        WebkitMaskImage: mask, maskImage: mask,
        mixBlendMode: blend && blend !== "normal" ? blend : undefined,
        visibility: maskUrl ? undefined : "hidden", // until the mask is ready, so the image never flashes unclipped
```

Limits on the mask's size:

```js file=apps/ZEditor/src/ui/canvas/ClipWrap.jsx
const MASK_MAX_SCALE = 2;          // mask px per page px at most (a page is 1.1 px per pt: this is ~2x sharper than the screen at 100%)
const MASK_MAX_PIXELS = 16000000;  // keeps a huge base's mask from growing without limit
```

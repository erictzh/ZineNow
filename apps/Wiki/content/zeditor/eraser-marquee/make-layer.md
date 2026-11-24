## Intro

**Make layer** turns the marked area into a **new picture layer**. **Layer via Copy** leaves the original as it is; **Layer via Cut** also takes the area out of the original, leaving a hole (see-through, a solid colour, or filled from the surroundings). The idea, and the key names, come from Photoshop.

## How to use

1. Mark an area with the [Marquee](zeditor/eraser-marquee/marquee) (**M**).
2. In the Marquee panel, **Make layer**: choose **Copy** or **Cut**, then the button, or press **Ctrl+J** (Layer via Copy) or **Ctrl+Shift+J** (Layer via Cut).
3. **Source:** *All visible* (everything you can see on the page) or *Selected layer* (only that layer). With "All visible", **Include paper** decides whether the paper's white comes along or stays see-through.
4. **Cut leaves:** *Transparent*, *Fill* (a solid colour) or *Surround* (made from the pixels round it; needs a fill style). Cutting from "All visible" cannot erase everything underneath, so it places a **cover** over the spot instead (a colour fill or a filled patch).
5. The new layer appears just above its source (or on top of everything), is selected, and the Move tool is chosen so the Format panel shows its image settings. It is **one undo step**.
- A pen or highlighter stroke, and text in a linked chain, can only be copied, not cut in part. A text box or shape that you cut is first turned into an image.

## How it works

### Drawing what to cut from

The area is cut out of a **picture** drawn at export resolution (200 dpi): either the whole page as you see it (with its filter), or the one chosen layer on its own, drawn alone on a see-through canvas the size of the page. Using export resolution keeps the new layer sharp in the PDF.

### A rectangle is cut in its own turned frame

If the marquee rectangle is turned, the picture is cut **in the rectangle's own axes**: the page picture is drawn rotated by the *opposite* angle about the rectangle's centre, so the rectangle becomes upright, and the new image is upright with no see-through corners, then the item is turned to match. This gives a clean, rotated crop. A polygon is cut as an upright picture of its bounding box, with everything outside the polygon made see-through by **clipping** (`ctx.clip(path)`). A brush is cut with a mask: the painted strokes drawn on a mask canvas, then the `destination-in` blend rule keeps only the painted part.

### Trim

Afterwards the new picture is **trimmed** to its visible pixels (see [Flatten](zeditor/images/flatten)) and the item is placed so the content sits exactly where it was on the page.

### Cut: what is left behind

- **Transparent:** the area is painted onto a mask, then removed from the layer's own picture with `destination-out`.
- **Fill:** the mask is filled with a colour (`source-in`: take the mask's shape, filled with the colour) and drawn over the picture.
- **Surround:** replaced from the surroundings ([Remove & fill](zeditor/eraser-marquee/remove-and-fill)).
For **All visible**, there is no single picture to erase from, so a **cover** layer is put under the new layer: a plain rectangle for a rectangle, or a picture of the polygon or brush shape, or the filled patch.

### Putting the results on the page

The page's items are a list in stacking order. The new layer goes **directly above its source** (`index + 1`), with the cover just under it; with no single source it goes on top of the list.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `buildMarqueeLayer`

```js file=apps/ZEditor/src/render/marqueeLayer.js fn=buildMarqueeLayer
```

**The Logic:**
- It works out what the button does **without changing anything**: it returns a `result` object, and the caller puts it on the page. This separation (compute first, apply after) makes the whole thing **one undo step** and lets it be cancelled safely.
- The first few lines are **guard clauses**: a layer must be chosen and visible when the source is "Selected layer"; a locked layer, a stroke or a threaded text cannot be cut. Each returns a `notice` (a message for the user) at once.
- `picture` is the page (or one layer) drawn at `EXPORT_SCALE`; `scale = EXPORT_SCALE / MAIN_SCALE` converts page pixels to picture pixels (about 2.525).
- `layerFromRegion` makes the new item (or `null` if nothing is visible). *Copy* returns now.
- For *Cut* or *Fill*, `surround` says whether the hole is filled from the surroundings, and `fillOpts` collects the fine-tune settings, each validated by `num(v, fallback, lo, hi)`: a number clamped into a range (`Math.min(hi, Math.max(lo, …))`), or a fallback if it is not a number. `half: (fillPatch − 1) >> 1` turns a patch size into a half-size (the `>> 1` shifts bits one place right: integer division by two).
- If working on one layer: a non-image layer is first **rasterized** (text, trace, shape) so it has pixels to cut; then `cutFromImage` produces the patched picture (`sourcePatch`). If working on everything visible, a `cover` is made, either filled from the page (`filledCoverFromPage`) or a plain colour (`coverForRegion`).
- If Pattern fill could not be used and Smooth was used instead (`fillInfo.fellBack`), a notice says so.

**Worked example.** A 100 × 50 page-pixel rectangle marquee, copy, all visible: `scale = 2.525`, so the picture region is `round(100 × 2.525) = 253` by `round(50 × 2.525) = 126` pixels, and the new layer is stored with those pixels but placed at its page size of 100 × 50 (253 / 2.525): sharp when exported at 200 dpi.

### `layerFromRegion`: a rectangle or polygon becomes a picture

```js file=apps/ZEditor/src/render/marqueeLayer.js fn=layerFromRegion
```

**The Logic:**
- `frame` is the rectangle itself, or the polygon's bounding box; `width`, `height` its size in picture pixels (at least 1).
- **Upright** (`angle === 0`): `shiftX` rounds the position to a **whole pixel** (`Math.round`), so the copy is the page's own pixels with no blurry edge, and the frame centre is moved to that rounded position (`centerX = (shiftX + width / 2) / scale`) so the item is placed exactly.
- **Turned:** the canvas is moved to its middle, **rotated by −angle** (`ctx.rotate`), and moved so the frame's centre is at the origin. The page picture drawn now appears with the frame straight.
- For a polygon: `ctx.clip()` with the polygon path restricts the drawing to inside it.
- `trimmedImageFromCanvas` crops to the visible pixels. The trimmed picture's middle, relative to the frame's middle, is converted to page units and **rotated back by `angle`** (`rotatePoint(..., angle)`) to find where the item must sit. The item is returned with its position, size, angle, natural size and `filter: { type: "none" }` (the page's filter is already in the pixels).

**Worked example.** An upright marquee at `x = 100.4`, 80.3 wide, scale 2.525: `width = round(80.3 × 2.525) = 203`; `centerX = 100.4 + 40.15 = 140.55`; `shiftX = round(140.55 × 2.525 − 203 / 2) = round(354.9 − 101.5) = 253`; the corrected `centerX = (253 + 101.5) / 2.525 = 140.4`: the copy starts on a whole picture pixel (253), so no pixel is half-covered.

### `layerFromBrush`

```js file=apps/ZEditor/src/render/marqueeLayer.js fn=layerFromBrush
```

**The Logic:** `b` is the painted area's bounding box, converted to picture pixels and clamped to the picture. The page picture is drawn shifted (`drawImage(picture, -left, -top)`) onto a canvas of exactly that size. A separate `mask` canvas gets the brush strokes drawn solid; then `destination-in` keeps only the part of the picture where the mask is. The result is trimmed and placed by adding the trim's offset to the box position and dividing by the scale.

### `cutFromImage`

```js file=apps/ZEditor/src/render/marqueeLayer.js fn=cutFromImage
```

**The Logic:** the image's own picture is drawn on a canvas at its natural size. `mapAreaToImage` converts the marked area from page pixels to the picture's pixels. With a fill style, `fillCanvasRegion` replaces the area from the surroundings. Otherwise the area is drawn on a mask canvas: for *Fill*, the mask becomes colour (`source-in` with `fillRect`) and is drawn over the picture; for *Transparent*, the mask is drawn with `destination-out`, erasing exactly the marked pixels. The result is a PNG (the only format that keeps the hole).

### `applyMarqueeResult`: where the new layer goes

```js file=apps/ZEditor/src/model/marquee.js fn=applyMarqueeResult
```

**The Logic:** `list` is the page's items, with the source item replaced by its patched copy (`{ ...a, ...result.sourcePatch }`) when it was cut. `at` is the position to insert at: right after the source (`findIndex(...) + 1`; the `|| list.length` handles a missing source). `added` collects the cover first, then the layer, so the **layer ends up on top of the cover**. `list.splice(at, 0, ...added)` inserts them, and the list is returned. IDs are provided by the caller (`newId`, `coverId`), which keeps this function pure.

**Worked example (real output).** Items `[1, 2, 3]`, source item 2 cut, with a cover and a layer: the result is **`[1, 2*, C, L, 3]`** (the 2 patched, then the cover, then the new layer, then 3). With no source (copy of everything visible): **`[1, 2, 3, L]`**: the layer goes on top.

### `makeLayer` in the Marquee state

```js file=apps/ZEditor/src/state/useMarquee.js fn=makeLayer
```

**The Logic:**
- It reads the current state through a **ref** (`latest.current`), so it is never stale (see [Keyboard shortcuts](zeditor/workspace/keyboard-shortcuts)).
- A fill that needs a style but has none chosen shows a notice and stops: no style is chosen by default **on purpose**, so you decide how it is filled.
- `busyRef` guards against starting a second job while one is running. `isUsableMarquee` checks there is a real marquee.
- `await buildMarqueeLayer(...)` does the slow work. If, in the meantime, the **page changed**, the result is **dropped** (`now.key !== page.key`) instead of being added to the wrong page.
- New ids are taken from the counter; `updateAnnotationsFor(pageIdx, (anns) => applyMarqueeResult(...))` adds everything as **one undo step**. For a new layer, the Move tool is selected and the new layer becomes the selection.
- `try … catch … finally`: an error becomes a message; `finally` always clears the busy flags.

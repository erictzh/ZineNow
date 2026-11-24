## Intro

**Flatten** bakes an image's crop, photo adjustments, filter and effects into a single new picture. Afterwards the effects are gone from the panel because they are now part of the pixels. Use it to lock a look in, to reduce file size, or before tools that need real pixels.

## How to use

Select an image, Format panel → **Flatten**. It is one undo step; **Undo** brings the effects back. The same baking is used by **Rasterize to Image** (for text, shapes and vector layers), by AI Background Removal, and by sending a picture to Ai Tools.

## How it works

### Drawing it once, with the export renderer

Flatten does not have its own drawing code. It uses the same function that **Export PDF** uses, so the new picture is exactly what the PDF would have shown. A canvas is made, the item drawn onto it at **export resolution** (200 dpi), and the canvas becomes the new picture.

### Why the canvas has margins

A shadow or a thick stroke spills **outside** the item's box. So the canvas is made larger by a margin that fits them: `stroke reach = thickness × miterLimit / 2` and `shadow reach = distance + 2 × blur`. A rotated item's corners reach past its own width and height too, so the canvas is sized for the **rotated outline**: `|w cos θ| + |h sin θ|` by `|w sin θ| + |h cos θ|`.

### Trimming

After drawing, the code finds the **bounding box of the visible pixels** (those with alpha above 0), crops the canvas to it, and moves and resizes the item to match, so the artwork stays exactly where it was on the page. Empty edges are thrown away; the item may become smaller *or bigger* (a shadow adds room).

### PNG or JPEG: whichever is smaller

If every pixel in the trimmed picture is fully opaque, both formats are possible: PNG (lossless) and JPEG at 92%. Both are encoded and the **shorter text wins**. Pictures with any transparency must stay PNG.

### Not upscaling for nothing

Effects and filters are drawn at export resolution. But with no look at all, there is no point enlarging a small picture, so the scale is capped at the picture's own resolution (`sourceScale`).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `flattenedImagePatch`

```js file=apps/ZEditor/src/render/bake.js fn=flattenedImagePatch
```

**The Logic:**
- `filter` is the filter the image really has (own or the page's). `exportScale = EXPORT_SCALE / MAIN_SCALE` converts editor pixels to export pixels (about 2.525).
- `hasLook` is true if a filter or any effect is on. `sourceScale` is how many source pixels there are per page pixel. `scale` is `exportScale` when there is a look, else the smaller of it and `sourceScale` (**never upscale** a plain picture).
- `bakeBoxToImage` does the drawing and trimming (next block) and returns the new picture fields, or `null` if nothing is visible (then Flatten does nothing).
- The returned patch clears everything that is baked in: every effect flag and each of its slider values (`clearedEffects`), the photo adjustments, the crop fields. `filter` becomes `{ type: "none" }` when a filter was baked in; an image that was only following the page filter keeps following it (`ann.filter`).
- `Object.fromEntries(list.map((c) => [c.prop, undefined]))` is a handy idiom: from a list of names it builds an object where each name has the value `undefined` (which removes it when the patch is applied).

### `bakeBoxToImage`

```js file=apps/ZEditor/src/render/bake.js fn=bakeBoxToImage
```

**The Logic:**
- `marginPx` is the room for a stroke and shadow, rounded **up** (`Math.ceil`) to whole pixels, plus 1.
- `widthPx` and `heightPx` are the item's size at export scale, **snapped to whole pixels**: an edge landing halfway across a pixel would be slightly transparent, and that would rule out JPEG for a photo.
- `turnedWidth` and `turnedHeight` size the canvas for the rotated outline (a bounding box of a rotated rectangle: `|w cos θ| + |h sin θ|`). The box is drawn at the centre (`boxLeft`, `boxTop`).
- `await draw(...)` paints the item. `trimmedImageFromCanvas` trims it. The new position is the old position plus how far the trimmed area is from the box's own corner, **divided by the scale** to go back to editor units; `angle: undefined` since rotation is now part of the pixels; the new natural size is the trimmed size in pixels.

**Worked example.** A 200 × 100 image (editor px) with a 6 px shadow thickness at 135° and no blur, no rotation, exported at scale 2.525. `shadowReach = hypot(4.24, 4.24) = 6`; `marginPx = ceil((0 + 6 + 1) × 2.525) = ceil(17.7) = 18`. The box is 505 × 253 px (rounded), so the canvas is `505 + 36 = 541` wide and `253 + 36 = 289` tall. After drawing, the visible area includes the shadow, which sits `4.24 × 2.525 = 10.7` px down and to the right in the picture, so the trimmed picture is about 516 × 264 and the new item about `516 / 2.525 =` **204 × 105** editor px: slightly bigger than the original, its top-left unchanged and the shadow now part of the picture.

### `trimmedImageFromCanvas`

```js file=apps/ZEditor/src/render/bake.js fn=trimmedImageFromCanvas
```

**The Logic:**
- `getImageData` gives the pixels; `alphaAt(x, y)` reads one pixel's alpha (the fourth number of its group of four).
- Two nested loops scan every pixel, keeping the smallest and largest x and y of any pixel that is not fully transparent: the **bounding box** of the visible area. If `right < 0`, nothing was found and `null` is returned.
- A second scan of the trimmed area checks if **every** pixel is fully opaque (`alphaAt === 255`); it stops early (`&& opaque`) the moment it finds one that is not.
- `trimmed.getContext("2d").drawImage(canvas, -left, -top)` copies the box into a smaller canvas (drawing the big canvas shifted up-left, so the box lands at the origin).
- It encodes PNG and, only if opaque, JPEG too, and keeps JPEG if its text is shorter (`jpeg.length < png.length`).

**Worked example.** A 500 × 400 canvas where the artwork covers x 40–259 and y 30–229: `left = 40`, `right = 259`, `top = 30`, `bottom = 229`; `width = 259 − 40 + 1 = 220`, `height = 200`. The result is a 220 × 200 picture, and the caller moves the item by `(40 − boxLeft) / scale` so it stays where it was.

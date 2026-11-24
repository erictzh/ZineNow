## Intro

**Crop** trims a picture to a part of itself without destroying the rest: the full picture stays inside the item, and you can come back and move the window or reset it. It works with eight handles on a window drawn over the picture.

## How to use

- Select an image and press **C**, or use **Edit Crop** in the Format panel's *Crop* section (also the crop button on the touch bar). Switch it off with **Done Cropping**.
- Drag the **eight handles** of the crop window. **Shift** keeps the window's proportions.
- The crop cannot be used while the image is rotated (rotate after cropping). The window never leaves the picture and is at least 20 source pixels in size.
- **Reset** (in the section) removes the crop: the picture grows back to its full size around the window, which stays where it is.

## How it works

### A crop is a source rectangle

A crop is just four numbers on the image item: `cropX`, `cropY`, `cropW`, `cropH`, a rectangle in the **source picture's own pixels**. Drawing uses the canvas call `drawImage(img, sx, sy, sw, sh, 0, 0, width, height)`, which copies the source rectangle `(sx, sy, sw, sh)` into the box. No pixels are thrown away, so cropping is **non-destructive**.

### Resizing the window: the opposite side stays put

Each handle has a compass name. The two signs (`sx`, `sy`: −1, 0 or +1) say which sides it moves: east moves the right side, north-west moves the left and top. The code **clamps** every edge to the picture and to the minimum size, so the window cannot leave the picture or collapse.

### Keeping the proportions

With Shift, one **scale** factor is applied to both sides: a corner follows whichever axis the pointer moved further along, a side follows its own axis. The scale is limited by how far the window can grow before it meets the picture's edge (the *room*), and the window grows about the middle of the axis it is not changing.

### Resetting a crop

Just deleting the four numbers would squeeze the *whole* picture into the old, smaller box, with the wrong proportions. Instead the reset keeps the **on-page size of one source pixel** (`ann.width / ann.cropW`) and makes the box big enough for the full picture, shifting it so the cropped window stays exactly where it was.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `resizedCrop`

```js file=apps/ZEditor/src/model/crop.js fn=resizedCrop
```

**The Logic:**
- `crop` is `{ x, y, w, h }`; `dx`, `dy` the pointer's movement **in source pixels**; `handle` a compass name.
- `handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0` is a chain of **ternaries** giving `sx`; the same for `sy` with "s" and "n".
- *Free mode:* `left`, `right`, `top`, `bottom` are the window's edges. For a handle that moves the right side (`sx > 0`): `right = clamp(right + dx, left + min, natW)`, i.e. move it by `dx` but keep it at least `min` away from the left side and inside the picture. The left side moves the same way with `clamp(left + dx, 0, right − min)`. The result is rebuilt from the four edges.
- *Keep-ratio mode:* `wantW`, `wantH` are the sizes the pointer asks for. `scale` is the ratio for a corner (the larger of the two ratios) or the single relevant axis. `roomW` and `roomH` are how much the window can grow before it touches the picture. For an untouched axis the window grows evenly both ways: `2 × Math.min(cx, natW − cx)`, twice the distance from the middle to the nearer edge. The final `scale` is limited above by the room and below by the minimum size.
- The returned window keeps the opposite side or corner fixed (`x: sx > 0 ? x : sx < 0 ? x + w − nw : cx − nw / 2`).

**Worked example (real output).** Picture 1000 × 800, window `{ x: 100, y: 100, w: 400, h: 200 }`, minimum 20.
- *East handle, `dx = +100`:* `right = clamp(500 + 100, 120, 1000) = 600`: **`w = 500`**, nothing else changes.
- *West handle, `dx = −150`:* `left = clamp(100 − 150, 0, 480) = 0` (the picture's edge stops it at 0): window **`x = 0, w = 500`**.
- *South-east corner, Shift, `dx = 50, dy = 0`:* `wantW = 450`, `wantH = 200`; `scale = max(450 / 400, 200 / 200) = 1.125`; room: `900 / 400 = 2.25` and `700 / 200 = 3.5`; so the scale stays 1.125: **450 × 225**, same 2:1 shape.
- *Same corner, `dx = 1000` (a huge drag):* `scale = 3.5`, but room limits it to 2.25: **900 × 450**, stopping exactly at the picture's right edge.

### `cropResetPatch`

```js file=apps/ZEditor/src/render/bake.js fn=cropResetPatch
```

**The Logic:** with no crop it just clears the four fields (`cleared`). Otherwise: `sx`, `sy` are the page pixels per source pixel (box size ÷ window size). The full picture would be `naturalWidth × sx` by `naturalHeight × sy`. `lx`, `ly` are how far the **centre** of the box must move, measured in the box's own axes: the offset of the full picture's centre from the window's centre. For a rotated box this movement is turned by the rotation (`lx·cos − ly·sin`, `lx·sin + ly·cos`), and the new corner is the new centre minus half the new size.

**Worked example.** A box at `(40, 30)` of 200 × 100 shows the window `cropX 100, cropY 50, cropW 400, cropH 200` of a 1000 × 600 picture. `sx = 200 / 400 = 0.5`, `sy = 0.5`. The full picture would be **500 × 300**. `lx = −100 × 0.5 + 500 / 2 − 200 / 2 = 100`, `ly = −50 × 0.5 + 300 / 2 − 100 / 2 = 75`. New centre `(40 + 100 + 100, 30 + 50 + 75) = (240, 155)`; new corner **(−10, 5)**. Check: source pixel (100, 50) is now at `(−10 + 100 × 0.5, 5 + 50 × 0.5) = (40, 30)`: exactly where the window's corner was.

### Drawing with a crop

```js file=apps/ZEditor/src/render/drawImage.js
  let sx = ann.cropX || 0, sy = ann.cropY || 0;
  let sw = ann.cropW || img.naturalWidth || w, sh = ann.cropH || img.naturalHeight || h;
```

**The Logic:** `ann.cropX || 0` means "the crop's x, or 0 if there is none"; with no crop the source rectangle is the whole picture (its natural width and height), so an uncropped image needs no special case.

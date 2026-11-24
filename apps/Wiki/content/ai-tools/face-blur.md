## Intro

**Face blur** finds the faces in a picture and hides them with a **blur**, **pixelation** or a **black box**: useful before sharing a photo of a crowd or a protest. The detector is **YuNet** (OpenCV Zoo, MIT licence, only 0.23 MB). It **finds where faces are** and nothing more: it does not recognise or identify anyone.

## How to use

1. **Find faces** (download the model first, the box at the bottom). Each face gets a numbered orange box with its **score**.
2. **Minimum score (%)** (default 60): lower shows more possible faces and more false ones.
3. **Tap a box** to leave that face alone (it turns grey and dashed); tap again to include it. **Draw a box by hand** for a face the detector missed; **Remove my hand-drawn boxes** clears them.
4. Choose **Blur**, **Pixelate** or **Black box**, set **Strength (%)** and **Grow each box by (%)** (default 15: the detector's box is tight, so a little extra covers forehead, ears and chin; hand-drawn boxes are used as drawn).
5. **Hide N faces.** Undo brings them back.

## How it works

### Finding

1. The picture is **fitted inside a 640 × 640 square** (top-left, the rest black), keeping its shape. `k` is how much it was shrunk.
2. Colours are given in **B, G, R order, 0 to 255** with no scaling (what YuNet was trained on).
3. The model answers at three **strides** (8, 16 and 32 pixels), i.e. as three grids of cells: coarse grids find big faces, fine grids small ones. For each cell: a class score, an "objectness" score and 4 numbers for the box (offsets from the cell and the **logarithm** of the width and height).
4. Each cell's **score** is `sqrt(cls × obj)`; cells above the minimum become boxes, scaled back to picture pixels (`÷ k`).
5. Overlapping boxes of one face are merged by **non-maximum suppression**: best first; a box is dropped if it overlaps an already kept box too much.

### Hiding

- **Black box:** fill the rectangle.
- **Pixelate:** shrink the box to a tiny picture (a few "cells" across) and draw it back enlarged *without smoothing*, so each cell becomes a visible square.
- **Blur:** draw the original through a `blur(radius)` filter, clipped to the box. If the browser has no canvas filter, shrink-then-enlarge with smoothing is used instead.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `decodeYunet` and `nms`

```js file=shared/js/ai/faces.js fn=decodeYunet,nms
```

**The Logic:**
- `get("cls", s)` returns the model's output list for that kind and stride, or `null`; a missing one throws *Unexpected model outputs*.
- For stride `s`, the grid has `cols = ceil(W / s)` columns and `rows = ceil(H / s)` rows. Cell `(r, c)` is number `i = r × cols + c`.
- The box: centre `cx = (c + dx) × s` where `dx` is the model's offset in cells; width `exp(logW) × s`. (`Math.exp` undoes the logarithm: the model predicts log-sizes because sizes vary hugely and logs keep numbers small.) The corner is `(cx − w/2) / k`: back in picture pixels.
- `nms` sorts by score (`b.score − a.score`: highest first) and keeps a box only if, for **every** kept box `g`, the overlap ratio is under `thr`. The ratio is **IoU** ("intersection over union"): the area both share divided by the area they cover together: `inter / (areaF + areaG − inter)`.

**Worked example (NMS, threshold 0.3).** Boxes: A `10 × 10` at (0,0), score 0.9; B `10 × 10` at (1,1), score 0.8; C `10 × 10` at (50,50), score 0.7. A is kept. B overlaps A: intersection `9 × 9 = 81`, union `100 + 100 − 81 = 119`, IoU `0.68 ≥ 0.3`: **dropped**. C does not overlap: kept. Result scores: **0.9, 0.7**.

### `paddedBox`

```js file=shared/js/ai/faces.js fn=paddedBox
```

**The Logic:** grow by `padPct %` of the face's width and height on each side, round outwards (`floor` for the top-left, `ceil` for the bottom-right), and clamp inside the picture.

**Worked example.** Face `{ x: 100, y: 50, w: 80, h: 100 }`, 15% in a 640 × 480 picture: `px = 12`, `py = 15`: `x0 = 88`, `y0 = 35`, `x1 = 192`, `y1 = 165` → box **`{ x: 88, y: 35, w: 104, h: 130 }`**. A face at `{ x: 2, y: 3, w: 80, h: 100 }`: the grown corner goes negative, so it clamps to 0: `{ x: 0, y: 0, w: 94, h: 118 }`.

### `detectFaces`

```js file=shared/js/ai/faceSession.js fn=detectFaces
```

**The Logic:** `k = min(640 / width, 640 / height)` is the scale that fits the picture inside the square. A black square canvas is filled and the shrunk picture drawn at the top-left. The output names are matched flexibly (`cls_8`, or any name containing `cls` and `8`) in `get`. The minimum accepted score here is 0.1; the tool then filters again by your **Minimum score**. The model runs on the processor and is released after a quiet minute.

### `hideBox`

```js file=apps/AiToolsLocal/src/tools/faceBlur.js fn=hideBox
```

**The Logic:** it reads from `src`, **a copy of the picture before any hiding**, so each face is blurred from the original and boxes that overlap do not blur each other twice. Pixelate: `cells = max(3, round(24 − strength/100 × 20))` is the number of squares across the longer side (strength 0 gives 24 cells, 100 gives 4), `block = round(longer side / cells)` the square's size in pixels. Blur: `radius = strength/100 × 0.3 × longer side`.

**Worked example.** A 200 × 150 box, strength 50: pixelate `cells = round(24 − 10) = 14`, `block = round(200 / 14) = 14`: the box is shrunk to `14 × 11` and enlarged back. Blur radius `0.5 × 0.3 × 200 =` **30 px**. Strength 100: `cells = 4`, `block = 50`, radius 60.

## Intro

**Upscale** enlarges a picture **2 or 4 times** and adds believable detail, not just blur. The model is **Real-ESRGAN general x4v3** (BSD-3-Clause, a small 4.9 MB model, 4× is its native size). It is the **heaviest** tool: a small picture takes seconds; a big one minutes. It works on **tiles** (small squares) so even big pictures fit in memory.

## How to use

1. Choose **Enlarge by** 2× (about 4 times faster) or 4×. A line shows the result size, for example *1000 × 800 px → 2000 × 1600 px*, and warns *too big* beyond **8192 px** on the long side or **40 million pixels**.
2. **Piece size (tiles):** 64 (gentle on memory, slower), 96, **128** (default) or 192 (faster, more memory).
3. **Run on:** the processor, or the graphics chip (if the device has one; if it fails the tool continues on the processor).
4. **Enlarge.** A progress bar, the time per tile and an estimate of seconds left show. **Cancel** stops cleanly and leaves the picture unchanged.
5. The result becomes the picture; **Undo** brings the original back. Try a small picture or 2× first.
- Transparency is kept: the model only handles colours, so the alpha channel is stretched from the original.

## How it works

### Tiles with borders

The picture is cut into a grid of **tiles**. Each tile is given to the model together with an extra **border of 12 px** of its neighbours (`pad`), because a tile edge has no context and would show seams. The model enlarges the whole square; only the **middle** (the tile itself, without the border) is kept and drawn at the tile's position times the scale `S`.

### Edges

A tile near the picture's edge would reach outside it; the missing pixels **copy the nearest edge pixel**.

### Scale

The model's own factor is found from its first answer: output side ÷ input side (4). For 2×, the 4× result is **shrunk by half** with smoothing.

### Fixed or flexible input size

If the model declares a fixed input size (in its metadata), that size is used as the tile square, and the tile = size − 2 × pad.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `tilePlan`, `tileInput`, `tileToRgba`, `resultSize`

```js file=shared/js/ai/upscale.js fn=tilePlan,tileInput,tileToRgba,resultSize
```

**The Logic:**
- `tilePlan` loops down and across in steps of `tile`; the last row and column are smaller (`Math.min(tile, W − x0)`).
- `tileInput(rgba, W, H, ox, oy, T)` makes the model's input: three planes (red, green, blue) of `T × T` values 0 to 1 (`÷ 255`). The coordinates `sx`, `sy` are **clamped** to the picture (`Math.min(H − 1, Math.max(0, …))`), so outside pixels copy the nearest edge pixel.
- `tileToRgba(od, OT, S, pad, w, h)`: the answer is `OT × OT` (`OT = T × S`). The tile's own part starts `pad × S` pixels in. Values are clamped to 0..1 and scaled to 0..255; alpha 255.
- `resultSize` multiplies by `want` and says whether the longest side exceeds the limit.

**Worked example.**
- `tilePlan(300, 200, 128)`: **6 tiles**: `(0,0) 128×128`, `(128,0) 128×128`, `(256,0) 44×128`, `(0,128) 128×72`, `(128,128) 128×72`, `(256,128) 44×72`.
- Tile 128 with border 12: model input `T = 128 + 24 = 152`. A 2000 × 1500 picture needs `ceil(2000/128) × ceil(1500/128) = 16 × 12 =` **192 tiles**.
- `resultSize(2000, 1500, 4, 8192)` → 8000 × 6000, within the side limit, but 48 million pixels is over 40 million, so the tool says *too big*. `resultSize(1000, 800, 2)` → 2000 × 1600: fine.
- `tileToRgba` for a 1 × 1 tile with `S = 4`, `pad = 1`, in an 8 × 8 answer: the tile's pixel is at `(4, 4)`, index `4 × 8 + 4 = 36`; its red value `36/63 = 0.571` becomes `round(0.571 × 255) =` **146**; a value of 1.5 becomes **255** (clamped), 0 stays 0.

### `upscaleCanvas`

```js file=shared/js/ai/upscaleSession.js fn=upscaleCanvas
```

**The Logic:** it loads the session (`acquire(gpu)`), reads the picture's pixels once (`getImageData`), makes the tile plan, and loops. Each tile: check `shouldCancel()`; build the input at `(t.x0 − pad, t.y0 − pad)` (the border starts before the tile); run the model; on the first answer work out `S = OT / T` (must be a whole number ≥ 1) and create the big output canvas `W × S` by `H × S`; `tileToRgba` extracts the middle; `putImageData` places it at `x0 × S, y0 × S`. Times are collected for the progress report: `avg × tilesLeft / 1000` seconds. `await new Promise(r => setTimeout(r, 0))` gives control back to the browser between tiles so the page stays responsive and Cancel can be clicked. A graphics-chip failure re-creates the session on the processor and retries the same tile.

### The tool

```js file=apps/AiToolsLocal/src/tools/upscale.js
    function sizeLine() {
      if (!picture.loaded) return { text: "Open a picture first.", bad: false };
      const r = resultSize(picture.width, picture.height, want, MAX_SIDE);
      const big = r.tooBig || r.w * r.h > MAX_PIXELS;
      return { text: picture.width + " × " + picture.height + " px  →  " + r.w + " × " + r.h + " px" + (big ? " (too big: use 2×, or crop the picture first)" : ""), bad: big };
    }
```

**The Logic:** it returns a text and a "bad" flag: bad when the result's long side exceeds 8192 or its area exceeds 40 million pixels (`r.w * r.h > MAX_PIXELS`; `40e6` is scientific notation for 40,000,000).

**Worked example.** 500 × 400 at 4×: 2000 × 1600 = 3.2 million pixels: fine. 4000 × 3000 at 4×: 16000 on the long side: *too big: use 2×, or crop the picture first*. At 2× it is 8000 × 6000: 48 million pixels, also too big; 3000 × 2000 at 2× = 6000 × 4000 = 24 million: fine. The time estimate for 192 tiles at 700 ms each after 12 are done: `700 × 180 / 1000 =` **126 s** left.

## Intro

The **Eraser** has three modes: **Stroke** removes whole pen or highlighter strokes; **Soft** rubs away an image's own pixels with a feathered round brush; **Magic** erases a whole area of one colour with a single click, like a magic wand. The last two work on **pictures**, changing their pixels to see-through.

## How to use

Choose **Eraser** in the toolbar, then a **Mode** in the Format panel:
- **Stroke:** drag across a pen or highlighter stroke; every stroke the pointer touches is deleted (locked or hidden ones are skipped).
- **Soft:** set **Size** (default 40), **Softness** (60) and **Strength** (100) and rub over an image. It works on the topmost image under the pointer; **Shift+click** picks one image so it can be erased even underneath another. Each swipe is one undo step.
- **Magic:** click a colour on an image. A **live preview** opens: change the settings until you like it, then press **Enter** to apply it, or **Esc** (or Ctrl+Z) to cancel. Settings:
  - **Tolerance** (brightness, 0–255, default 32) and **Colour tolerance** (hue and saturation, default 13), **Smoothing** (0–6 px), **Contiguous** (only connected pixels; default on) and **Diagonal**, **Softness** (default 20%), **Opacity** (default 100%).
  - **Click mode:** *Erase a colour*, or *Refine edge*, which only tidies an existing see-through boundary using **Feather**, **Edge shift**, **Specks** and **Defringe**.

## How it works

### Stroke mode: hit testing

For every stroke the pointer passes, the code measures the distance from the pointer to each **segment** of the stroke (see [Draw and Highlight](zeditor/shapes/draw-highlight)). If it is within half the stroke's width plus 6 px, the stroke is deleted.

### Soft mode: stamps ("dabs")

A brush stroke is not one drawing, but a row of overlapping round **stamps** (dabs) placed along the path. Each dab is a **radial gradient**: fully strong in the middle, fading to nothing at the rim. It is drawn with the blend rule `destination-out`, which **removes** whatever is already there in proportion to the dab's alpha, so the picture's pixels fade to see-through. Three ideas make it feel like a soft eraser:
- **Spacing.** Dabs are placed every quarter of the brush radius along the path (never less than half a pixel), so a fast swipe leaves a smooth line, not separate spots.
- **Strength per dab.** Because about four dabs overlap everywhere, the strength setting is split between them so that their combined effect equals your chosen strength: `dabAlpha = 1 − (1 − strength)^(1/4)`.
- **Softness.** The gradient stays full up to `1 − softness` of the radius, then fades.
The brush is measured in **page pixels**, but it erases the picture's own **natural pixels**: the position is converted (allowing for the image's size, rotation and crop) so the brush keeps its on-page size even on a big photo.

### Magic mode: a coverage map

The magic eraser first builds a **coverage map**: one number from 0 to 1 per pixel, "how much of this pixel to erase". Only at the very end is it turned into transparency. Building it is a pipeline:
1. **Match.** Compare each pixel's colour with the clicked one. Brightness and colour are measured **separately** (so shadows on a surface can match while a different colour does not).
2. **Flood fill** (when *Contiguous*): start at the clicked pixel and spread to matching neighbours, so only the connected area is erased.
3. **Specks:** small islands are flipped.
4. **Edge shift:** grow or shrink the erased area by whole pixels.
5. **Feather:** blur the edge of the map.
6. **Defringe:** pull the colour of half-erased edge pixels towards the colours that stay.
7. **Apply:** coverage × opacity lowers each pixel's alpha.
The expensive step is 1; the rest is cheap. The preview therefore keeps the match and redoes only steps 3–7 when you move a slider that does not affect the match.

### Brightness and colour apart

Every pixel is compared with the clicked colour: `dLuma` is the average difference of the three channels (a brightness shift: a shadow darkens all three alike), and `dChroma` is what remains after removing it (a **colour** shift). Each is divided by its own tolerance; the larger ratio decides. A ratio of 1 or less means fully matched; the **softness** adds a fade zone beyond it where pixels are erased partly.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Stroke mode

```js file=apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx fn=startStrokeErase
```

**The Logic:** `erasedIds` is a `Set` of strokes already removed in this drag. `tryErase(pt)` goes through every item: a stroke that is not hidden or locked, not erased already, and for which `strokeHitTest(pt, a)` is true, is deleted (`onEraseStroke(a.id)`). It is tried at the press and then at every pointer move (`trackPointerDrag`).

### `imagePixelAt`: from the page to the picture's pixels

```js file=apps/ZEditor/src/render/softErase.js fn=imagePixelAt
```

**The Logic:** `cx, cy` is the image's centre; the page point relative to it is **rotated back** by the image's angle (`rotatePoint(…, −angle)`), giving `lx, ly` in the image's own frame. `u, v` shift the origin to the image's top-left. `inside` is true if the point lies within the image. The natural pixel is `cropX + u × cropW / width`: the position in the box, scaled to the source pixels, plus the crop's offset. `scaleX` is the number of natural pixels per page pixel, used to size the brush.

**Worked example (real output).** An image box at `(50, 50)`, 200 × 100, of a 1000 × 500 picture (no rotation, no crop). The page point `(100, 75)`: `cx = 150`, `cy = 100`; `lx = −50`, `ly = −25`; `u = −50 + 100 = 50`, `v = −25 + 50 = 25`; the natural pixel is **`(250, 125)`**, with a scale of **5** natural pixels per page pixel, so a 40 px brush becomes 200 natural pixels wide.

### `stampSoftErase`

```js file=apps/ZEditor/src/render/softErase.js fn=stampSoftErase
```

**The Logic:** `inner = clamp(1 − softness / 100)` (at most 0.99) is how far out from the centre the dab stays full strength. `globalCompositeOperation = "destination-out"` makes everything drawn **erase** instead of paint. The canvas is moved to the dab (`translate`) and stretched (`scale(radiusX, radiusY)`, different if the picture is displayed non-uniformly), so a **unit circle** becomes the right ellipse. A radial gradient from radius 0 to 1 has three stops: full alpha at 0, full alpha at `inner`, and nothing at 1. The circle is drawn with that gradient.

**Worked example.** Softness 60: `inner = 0.4`, so alpha is 100% (of the dab's strength) up to 40% of the radius, then fades linearly to 0 at the edge. Softness 0: `inner = 1`, capped to 0.99: a hard-edged disc.

### `eraseTo`: dabs along the path

```js file=apps/ZEditor/src/ui/canvas/softEraseGesture.js fn=eraseTo
```

**The Logic:** the first call stamps one dab. Afterwards, `step` is the spacing (`size / 2 / 4`, at least 0.5). `dist` is how far the pointer is from the last dab; if less than a step, nothing happens. Otherwise `n = floor(dist / step)` dabs are placed at evenly spaced points on the straight line between the two positions (`t = k × step / dist`, a **linear interpolation**), and the **last dab's position** is remembered (not the pointer's), so the spacing stays regular even when the pointer moves in uneven jumps.

**Worked example.** Brush size 40: `step = 40 / 2 / 4 = 5`. The pointer moves 23 px: `n = floor(23 / 5) = 4` dabs at 5, 10, 15 and 20 px along the line; the last position stored is at 20 px, so the next move measures from there (the remaining 3 px are not lost). Strength 100: `dabAlpha = 1 − (1 − 1)^(0.25) = 1`; strength 50: `1 − 0.5^0.25 = 1 − 0.841 =` **0.159**; four dabs of 0.159 stack to `1 − (1 − 0.159)^4 = 0.5`: exactly the 50% asked for.

### `magicMatch` and the colour comparison (`matchCoverage`)

```js file=apps/ZEditor/src/render/magicErase.js fn=magicMatch
```

```js file=apps/ZEditor/src/render/magicErase.js fn=matchCoverage
```

**The Logic:**
- `magicMatch` handles the special cases: in *refine* mode the coverage map is just "1 where the picture is already fully transparent"; otherwise it returns `null` (nothing to do) if the click is off the picture or on a pixel that is already see-through. Already transparent pixels always count as erased (`cov[i] = 1`).
- `matchCoverage`: `colorLimit = colorTolerance × 1.5` (the largest hue difference is about 360, so a tolerance of 255 reaches it). `fade = softness / 100` and `reach = 1 + fade` define the fade zone.
- `smooth(i)` computes the **alpha-weighted average colour** of the small window around pixel `i` (radius = Smoothing). Weighting by alpha stops already-erased pixels pulling the average towards black. This averaging makes the comparison ignore grain and noise.
- `score(i)`: `dr, dg, db` are the differences from the clicked colour; `dLuma = (dr + dg + db) / 3` is the brightness shift; `dChroma = hypot(dr − dLuma, …)` is the remainder, the colour shift. Each is divided by its tolerance (`ratio`), and `d` is the larger. `d ≤ 1` gives 1 (erase fully); `d ≥ reach` gives 0; in between `(reach − d) / fade` falls from 1 to 0.
- Not contiguous: every pixel is scored. **Contiguous:** a **flood fill** with an explicit `stack`: pop a pixel, score it; if it matches at all (`s > 0`), store the score and push its not-yet-seen neighbours (4, or 8 with *Diagonal*). `seen` ensures each pixel is queued once.

**Worked example (real output).** Click on `(200, 100, 50)`. Tolerance 32, colour tolerance 13 (so `colorLimit = 19.5`), softness 20 (`fade = 0.2`, `reach = 1.2`), no smoothing. Row of six pixels, coverage result **`[1, 1, 1, 0.557, 0, 0]`**:

| Pixel | difference | `dLuma` | `dChroma` | ratios (luma, colour) | `d` | coverage |
|---|---|---|---|---|---|---|
| (200,100,50) | 0 | 0 | 0 | 0, 0 | 0 | **1** |
| (210,110,60) | +10 each | 10 | 0 | 0.31, 0 | 0.31 | **1** (a lighter shade of the same colour) |
| (220,100,50) | (+20, 0, 0) | 6.7 | 16.3 | 0.21, 0.84 | 0.84 | **1** |
| (226,100,50) | (+26, 0, 0) | 8.7 | 21.2 | 0.27, 1.09 | 1.09 | `(1.2 − 1.09) / 0.2 =` **0.557** (partly) |
| (200,130,50) | (0, +30, 0) | 10 | 24.5 | 0.31, 1.26 | 1.26 | **0** (past the fade zone: a different colour) |
| (240,100,50) | (+40, 0, 0) | 13.3 | 32.7 | 0.42, 1.68 | 1.68 | **0** |

The alpha result is `[0, 0, 0, 113, 255, 255]`: `255 × (1 − 0.557) = 113`. With **Opacity 50%** it becomes `[128, 128, 128, 184, …]`. In a row `A, X, A` (the same colour on both sides of a different one), *Contiguous* erases only the first A; with it off, both are erased.

### `magicFinish`

```js file=apps/ZEditor/src/render/magicErase.js fn=magicFinish
```

**The Logic:** the edge steps run in a fixed order on the coverage map: `removeSpecks`, `shiftEdge`, `featherEdge`, `defringeEdge`, each only if its setting is on. Then coverage becomes alpha: `next = round(a × (1 − min(1, c) × strength))`: the pixel's old alpha is multiplied by what is left after erasing. Opacity is applied **last**, so the shape steps always work on the full-strength mask. `changed` counts pixels whose alpha changed.

**Worked example.** Coverage 0.557, original alpha 255, opacity 100%: `255 × (1 − 0.557) = 113`. With opacity 50%: `255 × (1 − 0.557 × 0.5) = 184`.

### `shiftEdge`

```js file=apps/ZEditor/src/render/magicErase.js fn=shiftEdge
```

**The Logic:** a positive shift **grows** the erased area, a negative one **shrinks** it, one pixel per pass. Each pass, every pixel takes the largest (grow) or smallest (shrink) coverage among its neighbours and itself: a **morphological dilation or erosion**. Passes alternate between 4-neighbour (up, down, left, right) and 8-neighbour (with diagonals), so the result is roughly round, not a diamond or a square. Two arrays `src` and `dst` swap each pass (`[src, dst] = [dst, src]`), so a pass reads the previous state while writing the next one. Because it uses `max`/`min` on 0–1 values, soft edges move too.

**Worked example (real output).** A row `[0,0,1,1,0,0,0]` with Edge shift **+1**: pass 1 (4 neighbours): each pixel takes the max of itself and its left/right neighbours, giving `[0,1,1,1,1,0,0]`: the erased stretch grew by one pixel each side, so the alpha is `[255, 0, 0, 0, 0, 255, 255]`. A row `[0,1,1,1,0]` with **−1** becomes `[0,0,1,0,0]` (alpha `[255, 255, 0, 255, 255]`).

### `featherEdge` and the box blur

```js file=apps/ZEditor/src/render/magicErase.js fn=featherEdge,boxBlurRows
```

**The Logic:** a blur of the coverage map softens the edge. `radius = max(1, round(feather / 2))`. Two passes, each of a horizontal then a vertical **box blur**, approximate a smooth **Gaussian-like** blur (blurring twice with a box gives a triangle, close to a bell curve). `boxBlurRows` uses a **sliding window sum**: `sum` holds the total of the `2r + 1` values in the window; moving one pixel right, add the value entering (`src[row + min(width − 1, x + r + 1)]`) and subtract the one leaving; `dst = sum / n`. That makes the cost independent of the radius. `Math.min(width − 1, …)` and `Math.max(0, …)` clamp at the edges.

**Worked example (real output).** A single erased pixel in a row of seven, Feather 2 (`radius = 1`, `n = 3`): pass 1 gives `[0,0,⅓,⅓,⅓,0,0]`; pass 2 gives `[0, 1/9, 2/9, 3/9, 2/9, 1/9, 0]`: the alpha is **`[255, 227, 198, 170, 198, 227, 255]`**: a soft triangle instead of a hard dot.

### `removeSpecks`

```js file=apps/ZEditor/src/render/magicErase.js fn=removeSpecks
```

**The Logic:** it finds **connected patches** of the same kind (erased: coverage ≥ 0.5, or kept) with another flood fill (`visit` pushes same-kind neighbours). A patch of at most `maxSize` pixels is flipped: a small *kept* island inside the erased area is erased (`cov[i] = 1`); with `clearIslands` (whole-image mode), a small *erased* island elsewhere is kept again, unless it contains the clicked pixel (`hasProtect`). Only the first `maxSize` members of a patch are stored (`members`), since larger patches are ignored anyway.

### `defringeEdge`

```js file=apps/ZEditor/src/render/magicErase.js fn=defringeEdge
```

**The Logic:** a **halo** (fringe) is the leftover colour of the old background on half-erased edge pixels. For each pixel that is partly erased (coverage between 0.02 and 0.98) and visible, it averages the colour of the **fully kept** pixels within 3 px, and pulls the pixel's colour towards that average by `k = strength × sqrt(c)`: the more erased the pixel, the stronger the pull (the square root makes the effect rise quickly for the first bit of coverage). **Worked example.** Defringe 50% (`strength = 0.5`), a pixel `(200, 100, 50)` with coverage 0.5 whose kept neighbours average `(180, 90, 40)`: `k = 0.5 × √0.5 = 0.354`; red becomes `200 + (180 − 200) × 0.354 =` **192.9**, green `100 − 3.5 = 96.5`, blue `50 − 3.5 = 46.5`: it moves towards the colours that stay, so the old background's tint disappears from the edge.

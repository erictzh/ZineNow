## Intro

**Remove & fill** erases the marked area and **repairs** the hole using the pixels around it, so the object seems never to have been there. This repair is called **inpainting**. ZEditor has three classical (non-AI) methods, with different strengths: **Smooth**, **Detailed** and **Pattern**. A fourth, **AI**, is on [its own page](zeditor/eraser-marquee/remove-and-fill-ai).

## How to use

1. Mark the unwanted area with the [Marquee](zeditor/eraser-marquee/marquee).
2. In the Marquee panel choose **Remove & fill**, pick a **Style**, and press the button. There is no style chosen at first, on purpose. The result replaces the area; **one undo step**.
3. Styles:
  - **Smooth:** a smooth blend of the colours around the area. Best for plain paper, flat colours and soft gradients.
  - **Detailed:** continues lines and edges from the edge inwards. Best for scratches, small marks and text on a photo. A big hole turns blurry.
  - **Pattern** (best for textures): copies **real texture** from elsewhere in the picture. Best for grass, brick, asphalt, foliage. Settings: **Mix** (how much is texture copy vs smooth blend, 100%), **Patch size** (15 px), **Copy from** reach (80 px), **Grow** (make the area bigger, 0–40), **Grain** (add noise like the surroundings, 100% of what the picture has).
4. **Try another** repeats the fill with another random choice of patches (see below).
- Pattern fill works on holes up to **360 px** across; for bigger ones it falls back to Smooth and tells you.

## How it works

### The three ideas

- **Smooth** solves a maths problem: find the smoothest picture inside the hole whose edge matches the surroundings. The solution is the one a stretched rubber sheet would take.
- **Detailed** (Telea) works from the edge **inwards**, one pixel at a time, each pixel an average of nearby known pixels, **weighted towards those in the direction the edge runs**, so lines continue through the hole.
- **Pattern** (Criminisi) works from the edge inwards one **patch** at a time, copying whole pieces of real picture from the best match elsewhere.

### Smooth: Laplace's equation, solved by relaxation

A **harmonic** function is one with no bumps or dips of its own: its value at each point is the **average of its neighbours**. Fixing the colours on the hole's border and demanding "every hole pixel is the average of its four neighbours" is **Laplace's equation**, and its solution blends the border colours as smoothly as possible: no lines, no texture. In one dimension that is a straight line between the two ends. It is solved by **relaxation** (Gauss-Seidel): start with a guess, and repeatedly replace each hole pixel by the average of its neighbours; the picture slowly settles. That is slow for big holes (information crawls one pixel per sweep), so it is solved **from coarse to fine** (**multigrid**): shrink the picture by 2, solve there (where distances are halved), scale the answer up, and polish with a few sweeps. The recursion repeats until the picture is small enough (40 px) to solve directly.

### Detailed: Telea's fast marching

The hole's pixels are filled in order of their **distance from the edge**: the nearest first. The ordering comes from the **fast marching method**, which computes a "time of arrival" T for each hole pixel as if a wave started at the edge and moved at constant speed. It uses a **min-heap** (a priority queue that always gives back the smallest T), so the nearest unfilled pixel is always next. T is solved from the **eikonal equation** (|∇T| = 1: a wave moving at unit speed) from two known neighbours at a time. When a pixel is reached, it is filled as a **weighted average** of the known pixels within 5 px, with weights:
- **direction:** pixels in the direction the wave came from count more (`|offset · ∇T|`);
- **distance:** closer pixels count more (`1 / dist`);
- **level set:** pixels with a similar T count more (`1 / (1 + |ΔT|)`).
Each known pixel's brightness is also **carried along its own gradient** to the target, so a sloping edge keeps sloping.

### Pattern: exemplar-based inpainting

Criminisi's method, step by step:
1. Find the **fill front**: the hole pixels touching known pixels.
2. Give each front pixel a **priority**: `confidence × data`. *Confidence* is the share of its patch that is already known; *data* says how strongly an **isophote** (a line of equal brightness, i.e. an edge) runs into the hole there. So areas with lots of known surroundings, and edges that should continue, are filled first.
3. Take the highest-priority pixel and its patch (15 × 15 by default). Look through the **candidate patches** (fully known areas) for the one whose known part is most similar: the smallest **sum of squared differences (SSD)** of colour.
4. **Copy** that candidate's pixels into the unknown part of the target patch.
5. Update the front and the priorities, and repeat until the hole is full.
Because real pixels are copied, grain and texture come for free. It cannot invent what is not in the picture.

### Matching grain

A smooth fill on a grainy photo shows as a suspiciously clean patch. So the noise of the known pixels near the hole is **measured** (each pixel against the average of its four neighbours; edges are skipped) and the same amount of random noise (**Gaussian**, with the measured spread) is added to the filled pixels. The generator is seeded, so the same fill always gives the same picture.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `fillCanvasRegion`: the coordinator

```js file=apps/ZEditor/src/render/marqueeLayer.js fn=fillCanvasRegion
```

**The Logic:**
- The AI style is handled elsewhere (it works on its own window).
- `around` is how much of the surroundings is read: at least 40 px, and for Pattern `reach + 8`, plus the *grow*. `areaBounds` is the area's box; the canvas is cut to that box plus `around` (clamped to the canvas), giving a work region `sx, sy, w, h`.
- The area is painted onto a mask canvas, **grown** by the Grow setting; `hole[i] = 1` wherever the mask has any alpha (so no rim of old pixels remains).
- *Pattern*: `patchFill` is tried; if it returns false (hole too big, nothing to copy from) a flag `fellBack` is set. If the Mix is below 100%, a smooth fill of the same hole is made too and the two are blended: `texture × mix + smooth × (1 − mix)`.
- Otherwise (or on fallback) `fillFromSurroundings` runs Smooth or Detailed. The filled pixels are written back with `putImageData`.

**Worked example.** Pattern, reach 80, grow 0: `around = max(40, 80 + 8) + 0 =` **88** px. A marked area with its box at `x 300…420`, `y 200…260` on a 1000 × 800 picture: the work region is `sx = 212`, `ex = 508`, `sy = 112`, `ey = 348`: **296 × 236** pixels; the hole (121 × 61) is small enough (360 max).

### `fillFromSurroundings`

```js file=apps/ZEditor/src/render/inpaint.js fn=fillFromSurroundings
```

**The Logic:**
- `grainAmount` is read from the options (1 = the same noise as the surroundings, 0 = none).
- The first loops find the hole's **bounding box** and count the hole pixels (none: nothing to do). The work box is the hole's box plus a 32 px `MARGIN`, clamped.
- The box is copied into a `Float32Array` (decimal numbers, four per pixel, better than bytes for averaging) with its hole mask; `full` keeps the original.
- **Too big?** `k` is the factor to shrink by so the longest side is at most 1600 px (Smooth) or 900 (Detailed): `Math.ceil(Math.max(bw, bh) / MAX_SIDE)`. The shrunk copy is solved and the answer is scaled back up.
- `harmonicFill` or `teleaFill` solves it. The answer is written back into the **hole pixels only** (`if (!full.msk[d]) continue`); for a shrunk solution, each pixel is read at its place with **bilinear sampling**. Finally grain is added.

### `shrink` and `sampleBilinear`

```js file=apps/ZEditor/src/render/inpaint.js fn=shrink,sampleBilinear
```

**The Logic:** `shrink(img, msk, w, h, k)` makes a picture `k` times smaller: each new pixel is the **average of the known pixels** in its `k × k` block (hole pixels are not counted); a block with no known pixel becomes a hole in the small picture. `sampleBilinear` reads a value at a **fractional** position: it takes the four surrounding pixels and mixes them by how close the position is to each: first along x (`v(xa,ya) × (1 − tx) + v(xb,ya) × tx`), then along y. That is **bilinear interpolation**, which gives smooth enlargement.

### `harmonicFill` and `relax`

```js file=apps/ZEditor/src/render/inpaint.js fn=harmonicFill,relax
```

**The Logic:**
- `harmonicFill` returns false if no pixel is known. For a small picture (`max(w, h) ≤ 40`): every hole pixel starts as the **mean** of the known pixels, then `relax(…, 400)` runs 400 sweeps.
- Otherwise: `coarse` is the picture shrunk by 2; `harmonicFill` is called **on it, recursively**: a function that calls itself with a smaller problem, until the small case is reached. The solution is scaled up with bilinear sampling into the hole, and 12 polishing sweeps are run.
- `relax`: for each hole pixel, add up its existing neighbours (left, right, up, down: `n` counts how many exist) in all four channels and set the pixel to `sum / n`. Updating **in place** (each pixel immediately sees the already-updated neighbours) is the **Gauss-Seidel** method, which converges faster than keeping the old values.

**Worked example (real output).** A single row of 7 pixels: red = 0 at the left end, 100 at the right end, the five between are the hole. The filled result is **`0, 16.7, 33.3, 50, 66.7, 83.3, 100`**: a perfectly straight ramp, the one-dimensional "smoothest" solution (each pixel is exactly the average of its two neighbours: `(16.7 + 50) / 2 = 33.3`). In 2D, an image whose left edge is blue and right edge is white gets a smooth blue-to-white gradient inside the hole.

### `teleaFill`: Telea's fast marching

```js file=apps/ZEditor/src/render/inpaint.js fn=teleaFill
```

**The Logic (in the order the code runs):**
1. **Set-up.** `flag` marks each pixel `KNOWN`, `BAND` (on the moving front) or `INSIDE` (still to fill); `T` holds arrival times (`FAR` = a huge number for "not reached"). A hole pixel starts `INSIDE`.
2. **The min-heap.** `push` and `pop` implement a **binary min-heap** stored in two parallel arrays: always giving back the entry with the smallest T in O(log n). `(p − 1) >> 1` is the parent index; the loops "sift" an entry up or down to keep the smallest on top.
3. **The start.** Known pixels touching the hole become `BAND` with T = 0 and are pushed.
4. **`solve(i1, i2)`** gives a pixel's arrival time from two neighbours: if both are known it solves the **eikonal equation** `(T − t1)² + (T − t2)² = 1` (a quadratic: the `sqrt` of `d = 2 − (t1 − t2)²`); with one known neighbour, `T = 1 + T[neighbour]` (one step further).
5. **`inpaintPixel`** fills one pixel: `gradT` is the **gradient** of the arrival time (direction of travel). For every known pixel `q` within radius 5 (`RADIUS`): its weight is `dir × (1 / dist) × (1 / (1 + |T[i] − T[j]|))`, then brightness and alpha are **carried** to the target along their own gradients (`lj + gradient · offset`), clamped to the range of nearby values (plus a little room, `0.3 × range + 2`) so no wild values appear. The colour is the sample's colour scaled by the carried brightness (`base × lc / lj`), so a brightness gradient cannot push the three colour channels apart (the code comment mentions streaks on a dark branch against sky). The pixel becomes the weighted average.
6. **The main loop.** `pop` the unprocessed pixel with the smallest T; mark it `KNOWN`. For each of its four neighbours that is `INSIDE`: compute its T from the four possible pairs of neighbours (the minimum of the four solves), fill it, mark it `BAND` and push it. This spreads the wave inwards.

**Worked example.** The weight of one known pixel `q` for the target `p`: `q` is 1 px to the left of `p` (so `rx = 1, ry = 0`, since `rx` is the target minus the known pixel), and the arrival-time gradient points right, `∇T = (1, 0)` (the wave came from the left, as it should). `dir = |(1)(1) + 0| = 1`, `dist = 1`, `|ΔT| = 1`: weight `1 × 1 × 1/2 =` **0.5**. Another known pixel 3 px *above* `p` (`rx = 0, ry = 3`): `dir = |0 × 1 + 3 × 0| = 0`, so it is set to `1e-6`: weight about **3 × 10⁻⁷**, essentially nothing. Pixels *along the direction the edge comes from* dominate, so a line crossing the hole border carries on through it.

### `patchFill`: Criminisi's exemplar-based fill

```js file=apps/ZEditor/src/render/patchFill.js fn=patchFill
```

**The Logic (in the order the code runs):**
1. **Work area.** The hole's box; a hole larger than `MAX_HOLE_SIDE = 360` returns `false`. The work region is the box plus a margin (the *reach*, at least `3 × HALF`). The pixels are copied into `img` (floats) and a `known` flag per pixel; `startKnown` keeps the original.
2. **Candidate patches.** A **summed-area table** `sat` (also called an *integral image*) is built: each entry holds the number of hole pixels in the rectangle from the corner to that point. With it, the number of hole pixels in **any** rectangle is found with four reads (`holesIn`, the inclusion–exclusion formula), no matter how big. A patch centre is a **candidate** if its whole `(2 × HALF + 1)²` window has 0 hole pixels. If there are more than 3000, every `stepEvery`-th is kept (evenly spread).
3. **Priorities.** `conf` is the confidence map (1 for known pixels, 0 for the hole). `isFront` is true for a hole pixel with a known neighbour. `priorityAt(i)` computes `confidence × data`: the **confidence** is the mean of `conf` over the patch; for the **data** term it finds the strongest brightness **gradient** among the known pixels beside it (central differences of the luma), the **normal** (the direction pointing out of the known part: the sum of the offsets to known neighbours), and takes the **dot product of the isophote** (the gradient turned a quarter: `(−gy, gx)`) **with the normal**, divided by 255, plus 0.001. A strong edge pointing into the hole gives a large data term.
4. **The loop** while the front is not empty: take the front pixel with the **highest priority**. Collect its patch's known pixels (`tOff`, `tRgb`). **Search** all candidates for the smallest SSD (the early `d < limit` test abandons a candidate as soon as it is worse than the best so far). With a variation `seed` the three best are kept and one is picked at random (a seeded generator): **Try another**.
5. **Copy** the best patch's pixels into the target patch's hole pixels; they become known, with the confidence of the pixel they were copied for (at least 0.05).
6. **Update** the front around the patch and the priorities nearby.
7. Every ~30 ms, `await new Promise(setTimeout 0)` hands control back to the browser so a big fill does not freeze the page, and `shouldStop()` allows cancelling.
8. Finally the pixels that were hole are written back into the picture.

**Worked example.** *Priority.* A front pixel whose patch is 60 of 225 pixels known: confidence `60 / 225 = 0.267`. Case A: the brightest gradient nearby is `(gx, gy) = (0, 40)` (brightness changes downwards, so the isophote is **horizontal**) and the normal points up `(0, −1)`: `data = |(−40) × 0 + 0 × (−1)| / 255 + 0.001 = 0.001`: the line runs parallel to the front: low priority. Case B: gradient `(40, 0)` (a **vertical** line) and the same normal: `data = |0 × 0 + 40 × (−1)| / 255 + 0.001 = 0.158`: a vertical line running up into the hole has about 158 times the priority, so the line is continued first. *Match.* A target patch has three known pixels `(100,100,100)`; a candidate has `(110,95,100)` at the first: `(10)² + (5)² + 0² = 125` for that pixel; the SSD is the sum over all known pixels; the candidate with the smallest total wins. *Candidates.* 9000 fully known centres and the limit 3000: `stepEvery = ceil(9000 / 3000) = 3`: every third is used. *Patch size.* Setting 15: `half = (15 − 1) >> 1 = 7`, a 15 × 15 patch (`2 × 7 + 1`).

### `addMatchingGrain`

```js file=apps/ZEditor/src/render/inpaint.js fn=addMatchingGrain
```

**The Logic:** for every known pixel away from the hole (the 4-neighbours are all known), the **residual** is the pixel minus the average of its four neighbours. Residuals larger than 24 are skipped (an edge or detail, not noise). The variances are accumulated per channel (`sum2`, `count`). A pixel minus the mean of four neighbours has **1.25 times** the noise variance (`1 + 4 × (1/4)²`), so `sigma = sqrt(sum2 / count / 1.25)` recovers the real noise level; with fewer than 50 samples or a spread under 0.6, nothing is added. `rand` is the same mulberry-style generator as before, started from a seed computed from the box size. `gauss` is the **Box–Muller transform**: `sqrt(−2 ln u₁) × cos(2π u₂)` turns two uniform random numbers into one normally distributed ("bell curve") number. Each hole pixel gets `amount × sigma × gauss()` added to its red, green and blue.

**Worked example.** A grainy photo whose neighbours differ from a pixel's four-neighbour mean by about ±4 (variance about 20): `sigma = sqrt(20 / 1.25) = 4`. Filled pixels get a random bell-curve value with spread 4 added, so about 68% of them move by less than 4 levels and 95% by less than 8: they now look as grainy as their surroundings. With Grain 0% the fill stays flat.

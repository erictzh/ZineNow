## Intro

**Curve fitting** turns a stair-stepped pixel outline into a clean, smooth shape with few points. It does three things: smooths the stairs, throws away unnecessary points, and joins the rest with curves, keeping sharp corners where the picture really has them. The result is an **SVG path**, the text a vector shape is stored as.

## How to use

In *Vectorize → Advanced*: **Paths** (low = loose, blobby outlines; high = outlines that hug the pixels) and **Corners** (low = bends become round curves; high = bends stay sharp, like cut paper).

## How it works

### 1. Edge midpoints: smoothing the stairs

An outline along pixel edges looks like a staircase. If instead of the corners we take the **middle of every unit edge**, a one-pixel step turns into a diagonal: the stairs smooth out.

### 2. Douglas–Peucker: fewer points

The smoothed outline still has a point for every pixel edge. The **Douglas–Peucker algorithm** keeps only the points that matter. To simplify a line from A to B: find the point furthest from the straight line AB. If it is closer than the **tolerance**, throw away all the points between A and B (the straight line is good enough). If it is further, **keep** it and repeat the process for A to it, and it to B. It is a **divide and conquer** recursion (here written with a stack of ranges instead of function calls). A loop is a closed ring, so it is split at the first point and the point furthest from it, and each half is simplified separately.

### 3. Round the corners, keep the sharp ones

At each remaining point the **turn angle** is measured: 0° is straight on, 90° is a right-angle bend. If the bend is bigger than the **corner angle**, the point is a true **corner** and stays sharp. Otherwise it is rounded with a **quadratic Bézier curve**: a curve that starts and ends on the two sides near the point, and is pulled towards the point itself as its "control point". How far the curve reaches along each side is limited, so a gentle bend on a long curve gets long, smooth arms, while a sharp bend between two straight sides only rounds off its tip and the sides stay straight.

### Why the tolerance matters

Tolerance (in picture pixels) is how far the simplified line may stray from the real outline. It scales with the picture size (see the settings page): *Paths 100* gives 0.35 px (hugs the pixels), *Paths 0* gives 1/50 of the long side (loose blobs).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `edgeMidpoints`

```js file=apps/ZEditor/src/model/trace/curves.js fn=edgeMidpoints
```

**The Logic:** `corners` is the flat list from the contour stage. For each pair of consecutive corners `(x0, y0)` to `(x1, y1)` (the last connects back to the first, via `% n`): `len` is the number of unit edges between them (`Math.abs(x1 − x0) + Math.abs(y1 − y0)`, since edges run along one axis only), and `sx`, `sy` the direction (`Math.sign` gives −1, 0 or 1). A loop `for (let t = 0; t < len; t++)` adds the **middle** of each unit edge: `x0 + sx × (t + 0.5)`.

**Worked example (real output).** The rectangle loop `[0,0, 3,0, 3,1, 0,1]` (3 wide, 1 tall) has 8 unit edges, so 8 midpoints: **`(0.5,0) (1.5,0) (2.5,0) (3,0.5) (2.5,1) (1.5,1) (0.5,1) (0,0.5)`**. Note the corner (3,0) of the rectangle is no longer a point; the outline now cuts the corner from (2.5,0) to (3,0.5).

### `simplifyOpen` and `simplifyClosed`

```js file=apps/ZEditor/src/model/trace/curves.js fn=segmentDistance,simplifyOpen,simplifyClosed
```

**The Logic:**
- `segmentDistance(p, a, b)` is the distance from a point to a **segment**. `t` is how far along the segment the point projects (a **dot product** divided by the segment's squared length), clamped to 0–1 so the nearest point stays *on* the segment (`Math.max(0, Math.min(1, …))`); the distance is then `Math.hypot` to `a + t·(b − a)`.
- `simplifyOpen`: `keep` is a list of flags (1 = keep), starting with the two ends. `stack` holds ranges still to check. Pop a range `[a, b]`, find the point `worst` in between that is furthest from the segment (and further than `tolerance`). If there is one, keep it and push the two sub-ranges. Finally `pts.filter((_, i) => keep[i])` returns the kept points.
- `simplifyClosed`: a loop of 4 or fewer points is returned as it is. Otherwise `far` is the point furthest from the first, the loop is cut there into two open lines, each simplified, and joined (without repeating the cut points). If simplification leaves fewer than 3 points, the original is kept.

**Worked example (real output).** A square outline with 12 points (corners plus extra points on the sides, one of them a tiny 0.1 bump), tolerance 0.5: the result is **`[[0,0],[3,0],[3,3],[0,3]]`**: only the four corners; the bump (0.1 < 0.5) and the points on the straight sides were all within tolerance of the straight lines, so they were discarded.

### `turnAngle`

```js file=apps/ZEditor/src/model/trace/curves.js fn=turnAngle
```

**The Logic:** with `u` the vector from `a` to `b` and `v` the vector from `b` to `c`, the angle between them comes from the **dot product**: `u · v = |u| |v| cos θ`, so `θ = acos((u · v) / (|u| |v|))`. The cosine is **clamped** to −1…1 (`Math.max(-1, Math.min(1, …))`), because rounding errors could push it slightly out of range and `acos` would return `NaN`. It converts radians to degrees (`× 180 / Math.PI`) and returns 0 for a zero-length side. **Worked example.** Going right then down: `u = (10, 0)`, `v = (0, 10)`: dot 0, so `acos(0) = 90°`. Going straight on: dot = `|u||v|`, `acos(1) = 0°`.

### `smoothPathD`

```js file=apps/ZEditor/src/model/trace/curves.js fn=smoothPathD
```

**The Logic:**
- `at(p, q, len)` is the point at distance `len` from `p` towards `q`.
- For each point `p`, `bend` is its turn angle. If it is bigger than `cornerAngle` (or zero), it is a **corner**: `a` and `b` are the point itself. Otherwise a **rounded** join: `reach = 2 × tolerance / tan(bend / 4)`. This comes from geometry: a point on a circle approximated within `tolerance` has sides about `tolerance / tan(bend / 4)` long; arms may be twice that. `arm(q)` is the smaller of **half the side** and `reach`, so arms never overlap their neighbour's. `a` and `b` are the points that far along each side.
- The path text starts at the last point's `b` (`M`), and for each point writes a straight line **to `a`** (`L`) and, if rounded, a **quadratic curve** `Q` with the point itself as the control and `b` as the end. `Z` closes the path. `num` rounds every number to a tenth, which is plenty and keeps the text short.

**Worked example (real output).** A 10 × 10 square with tolerance 1:
- Corner angle **90** (the middle Corners setting): the bend at each corner is exactly 90, and 90 is not *bigger than* 90, so all four corners are **rounded**: `reach = 2 × 1 / tan(22.5°) = 4.83`, the arms are the smaller of 5 (half a side) and 4.83, and the path is **`M0 5.2L0 4.8Q0 0 4.8 0L5.2 0Q10 0 10 4.8L10 5.2Q10 10 5.2 10L4.8 10Q0 10 0 5.2Z`**: a rounded square (a "squircle").
- Corner angle **80**: 90 > 80, so all four are **sharp corners**: **`M0 10L0 0L10 0L10 10L0 10Z`**.

So at the middle *Corners* setting (corner angle 90) an exact right angle is on the edge of being rounded; the slider's range 30°–150° decides.

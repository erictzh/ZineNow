## Intro

**Contour tracing** finds the **outline** of every area of a colour. Given a mask (1 = "this colour", 0 = not), it walks along the edges between pixels and produces closed loops, one for each separate blob and one for each hole. At this point the outlines are still stair-steps along pixel edges; smoothing comes next.

## How to use

You never use it directly. It runs inside Vectorize for each colour, and the **Noise** slider decides which tiny loops are dropped.

## How it works

### Edges of pixels

Imagine the pixels as squares on a grid. The grid has **vertices** (corners) at whole numbers. A pixel that is "inside" has up to four edges; an edge **counts as a boundary** if the neighbour on its other side is *outside* (or off the picture). So the algorithm first marks every boundary edge, and then **chains them together** into loops.

### A direction for every edge

Each boundary edge is directed so that **the inside is always on its right** as you walk along it. Going clockwise around a blob (on screen, where y points down) keeps the blob on your right, so **outer outlines run clockwise** and **holes run the other way** (anticlockwise). This has a lovely consequence: with the *nonzero* fill rule of SVG, the loops fill back to exactly the original mask: the hole loops cancel the area inside them.

### Following the edges

At each vertex up to four edges can leave (right, down, left, up), stored as four bits in one byte: 1, 2, 4, 8, combined with `|` (bitwise OR). Arriving at a vertex heading in some direction, the next edge is chosen by the rule **turn right if you can, else go straight, else turn left**. Because the right turn is tried first, pixels that touch only at a corner are kept apart as separate loops. Used edges are cleared (`&= ~bit`) so each is walked once. Only the points where the outline **turns** are stored (a long straight edge is one segment, not many).

### The area of a loop

`loopArea` uses the **shoelace formula**: `½ Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)`. It gives the loop's area, **positive for clockwise loops and negative for anticlockwise ones**. Vectorize uses the absolute value to drop loops smaller than the Noise setting.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `traceMaskLoops`

```js file=apps/ZEditor/src/model/trace/contours.js fn=traceMaskLoops
```

**The Logic:**
- `DX` and `DY` list the four directions on the grid (right, down, left, up), and `BIT` their bit values. `gw = width + 1` is the number of vertices per row. `out` is a byte array with one entry per vertex: which directions an edge leaves it by.
- `inside(x, y)` is true for a pixel inside the picture whose mask value is not 0. The first double loop looks at every inside pixel and, for each of its four sides whose neighbour is **not** inside, records an edge. For example a missing neighbour above means the top edge, from vertex `(x, y)` going right: `out[y * gw + x] |= 1`.
- `all` is a copy of the edges, kept intact so `nextDir` can still see edges that have been used. `nextDir(here, dir)` implements the rule: try `right = (dir + 1) % 4`, then straight on, then `left = (dir + 3) % 4`, returning −1 if none.
- The outer `for (let start …)` scans every vertex; `while (out[start])` takes a vertex with an unused edge and walks a loop from it. Each step clears the edge it uses, records the vertex **only if the direction changed** (`dir !== prevDir`), moves, and looks up the next direction. The loop ends when it is back at the start going the same way. `guard` is a safety limit that stops an endless loop on a damaged mask.
- If the loop's last edge ran the same way as the first, the start vertex is not a real corner and is removed (`points.splice(0, 2)`). A loop needs at least 3 points (`>= 6` numbers).

**Worked example (real output).** A 2 × 2 solid mask: one loop **`[0,0, 2,0, 2,2, 0,2]`**: four corners, going right, down, left, up. Its area is **4**. A 3 × 3 mask with the middle pixel empty (a square ring): two loops: the outer **`[0,0, 3,0, 3,3, 0,3]`** with area **+9** (clockwise) and the hole **`[1,1, 1,2, 2,2, 2,1]`** with area **−1** (anticlockwise): filled together, `9 − 1 = 8` pixels, exactly the ring. A mask of three pixels where one is in the top row and two are in the bottom (touching only at a corner) gives **two** separate loops: `[0,0, 1,0, 1,1, 0,1]` and `[1,1, 3,1, 3,2, 1,2]`.

### `loopArea`

```js file=apps/ZEditor/src/model/trace/contours.js fn=loopArea
```

**The Logic:** the loop is a flat list `[x0, y0, x1, y1, …]`, so `i` steps by 2. `j = (i + 2) % n` is the next point, wrapping round to the first (`%` is the remainder, so the last point connects back to the start). Each pair adds `xᵢ·yⱼ − xⱼ·yᵢ` (the cross product); half the total is the area. **Worked example.** The loop `[0,0, 2,0, 2,2, 0,2]`: pairs give `0·0 − 2·0 = 0`, `2·2 − 2·0 = 4`, `2·2 − 0·2 = 4`, `0·0 − 0·2 = 0`; the sum is 8, half is **4**. Reversing the direction gives −4.

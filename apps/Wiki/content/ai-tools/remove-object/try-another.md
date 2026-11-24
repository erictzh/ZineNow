## Intro

An AI model gives **exactly the same answer to the same input**. So when the first fill is not what you wanted, pressing the same button again would change nothing. **Try another** shows the model a slightly different *view* of the same job (the window moved a little, a bit bigger or smaller, the marks grown a few pixels), so it invents something different.

## How to use

- After a fill, press **Try another** (beside Remove object). The last fill is undone and redone with the next variation. Press it again for the next. The button's label stays the same; the status line says *(variation 2)*.
- It works only while your picture is exactly as the last fill left it: any other change (a new mark applied, an Undo, another tool) greys it out.
- There are **7** variations in a fixed cycle, then it starts again from the normal fill. Variation *N* is always the same view, so the results are repeatable.

## How it works

Each variation is a recipe of four numbers:

| # | dx | dy | scale | grow |
|---|---|---|---|---|
| 0 | 0 | 0 | 1 | 0 |
| 1 | −0.12 | 0 | 1 | 0 |
| 2 | 0.12 | 0 | 1 | 0 |
| 3 | 0 | −0.12 | 1 | 1 |
| 4 | 0 | 0.12 | 1 | 2 |
| 5 | 0 | 0 | 1.25 | 0 |
| 6 | 0.08 | 0.08 | 0.85 | 3 |

`dx`, `dy` shift the window as a fraction of its side; `scale` changes its side; `grow` adds pixels to the marked area (**never shrinks it**, since that could leave a ring of the old object). After shifting, the window is forced to stay inside the picture and to **still cover the whole marked area**; if it cannot, the original window is used.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The recipes

```js file=shared/js/ai/variations.js

export const AI_VARIATIONS = [
  { dx: 0, dy: 0, scale: 1, grow: 0 },
  { dx: -0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0.12, dy: 0, scale: 1, grow: 0 },
  { dx: 0, dy: -0.12, scale: 1, grow: 1 },
  { dx: 0, dy: 0.12, scale: 1, grow: 2 },
  { dx: 0, dy: 0, scale: 1.25, grow: 0 },
  { dx: 0.08, dy: 0.08, scale: 0.85, grow: 3 },
];
export function variationFor(n) { return AI_VARIATIONS[((Math.round(n) || 0) % AI_VARIATIONS.length + AI_VARIATIONS.length) % AI_VARIATIONS.length]; }

```

### `variationFor` and `varyCrop`

```js file=shared/js/ai/variations.js fn=variationFor,varyCrop
```

**The Logic:**
- `variationFor(n)`: `Math.round(n) || 0` makes sure it is a whole number (and 0 if not a number); `% 7` takes the remainder after dividing by 7 (the cycle); adding the length and taking `%` again makes **negative numbers wrap round too** (in JavaScript `-1 % 7` is `-1`, not 6).
- `varyCrop(crop, v, bounds, w, h)`: the new side is the old side times `scale`, kept between 1 and the picture's short side; if that is smaller than the marked area (`need`) the old side is used. The window's centre moves by `dx × side` and `dy × side`. Then three **clamping** steps: inside the picture; still containing the area (`x` between `bounds.x1 + 1 − side` and `bounds.x0`); inside the picture again. A final check returns the original `crop` if the area would stick out.

**Worked example.** Window `{ x: 244, y: 244, side: 512 }` in a 1000 × 1000 picture, marked area `x 400 to 450, y 400 to 450`:
| Variation | New window |
|---|---|
| 0 | `244, 244, 512` (unchanged) |
| 1 | `183, 244, 512`: shifted left by `0.12 × 512 = 61` |
| 5 | `180, 180, 640`: `512 × 1.25 = 640`, centre kept at 500, so `500 − 320 = 180` |
| 6 | `323, 323, 435`: `512 × 0.85 = 435`, centre moved by 41 |
| 7 | the same as 0 (`7 % 7 = 0`) |
| −1 | the same as 6 (wraps) |

(These were checked by running the real function.)

### The button

```js file=apps/AiToolsLocal/src/tools/removeObject.js
    async function tryAnother() {
      if (picture.busy || !last || picture.depth !== last.depth || ctl.state.phase !== "ready") return;
      const { marked, variation } = last;
      await picture.undo(); // back to before the last fill, then fill again with the next variation
      runFill(marked, variation + 1);
    }
```

**The Logic:** it only proceeds when not busy, a last fill exists, the picture's undo depth equals the depth recorded after that fill (`picture.depth !== last.depth` means something else changed it), and the model is ready. `await picture.undo()` goes back to before the fill (the snapshot), then `runFill(marked, variation + 1)` redoes it with the next recipe, using the *same marks*, which are remembered in `last`.

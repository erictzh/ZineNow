## Intro

The model's answer is not "yes/no per pixel" but a **score from 0 to 1**. Turning scores into transparency needs two settings: the **Edge cut-off**, below which a pixel is fully see-through, and the **Soft edge**, a fade just above it that avoids a hard, jagged outline. You adjust them while the preview updates live.

## How to use

- **Edge cut-off (%):** default **0.1**. Everything the model scores at or below it becomes see-through. Higher keeps *less* (a tighter cut); 0 keeps everything (cuts nothing). Fine values like 0.05 are allowed.
- **Soft edge (%):** default **10**, from 0.1 to 50. How wide the fade is, **above** the cut-off.
- The preview redraws while you type (at most once per screen refresh). **Apply** makes it the picture.
- If background is left behind, raise the cut-off a little; if the subject's edges are eaten, lower it or widen the soft edge.

## How it works

The models give the background **tiny, not exactly zero** scores. So useful cut-offs are very small (a fraction of a percent). The fade therefore goes only **upwards** from the cut-off: a fade that reached below it would leave that near-zero background half visible.

For a score `v`, cut-off `c` and soft width `s`:

`alpha = clamp( (v − c) / min(s, 1 − c) , 0, 1 )`

So `v ≤ c` is fully clear (0), `v ≥ c + s` is fully solid (1), and in between it ramps. The width shrinks near the top (`1 − c`) so the ramp cannot run past 1. With `c = 0` nothing is cut at all.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `softCut` and `maskToAlpha`

```js file=shared/js/ai/segment.js fn=softCut,maskToAlpha
```

**The Logic:** `softCut` returns early with 1 when the cut-off is 0 or less. `width` is the soft width limited to the room left (`1 − cutoff`) and never below 0.0001 (so no division by zero). `a` is how far through the fade the score is; `a < 0 ? 0 : a > 1 ? 1 : a` **clamps** it into 0 to 1. `maskToAlpha` applies it to every mask value and scales to 0 to 255 bytes, rounding.

**Worked example** (cut-off 0.1% = 0.001, soft 10% = 0.1):
| Score `v` | `(v − 0.001) / 0.1` | alpha (0 to 255) |
|---|---|---|
| 0 | −0.01 → 0 | **0** |
| 0.001 | 0 | **0** |
| 0.0505 | 0.495 | **126** |
| 0.101 | 1 | **255** |
| 0.5 | clamped 1 | **255** |

Other cases: cut-off 0 → always 1; cut-off 0.9 with soft 0.5, score 0.95: `width = min(0.5, 0.1) = 0.1`, `(0.95 − 0.9)/0.1 =` **0.5**; score exactly at the cut-off (0.5, 0.5) → **0**. (Checked by running the real functions.)

### `cutOutCanvas`

```js file=shared/js/ai/bgSession.js fn=cutOutCanvas
```

**The Logic:** it builds a small canvas whose pixels are all white with the **alpha** taken from `maskToAlpha` (the mask as an image). A copy of the picture is drawn on a new canvas; then the compositing mode is set to `destination-in` and the mask image is drawn **stretched to the picture's size** (`imageSmoothingQuality = "high"` smooths the stretch). `destination-in` keeps the existing pixels only where the new drawing is opaque, and scales their opacity by the new drawing's: so the picture's alpha becomes the mask's alpha.

### The live preview

```js file=apps/AiToolsLocal/src/tools/removeBackground.js
    function drawPreview() {
      raf = 0;
      if (!found) return;
      previewX.clearRect(0, 0, previewC.width, previewC.height);
      previewX.drawImage(cutOutCanvas(found.src, found.mask, found.side, cutoff / 100, Math.max(0.1, soft) / 100), found.region.x, found.region.y);
    }
```

```js file=apps/AiToolsLocal/src/tools/removeBackground.js
    const queuePreview = () => { if (!raf) raf = requestAnimationFrame(drawPreview); };
```

**The Logic:** `drawPreview` clears the preview canvas and draws the cut-out at the position of the area that was analysed (`found.region`), using the **current** cut-off and soft values (percent ÷ 100). `queuePreview` uses `requestAnimationFrame`: it asks the browser to run `drawPreview` before the next screen refresh, and the `if (!raf)` guard makes many rapid keystrokes collapse into **one** redraw per frame.

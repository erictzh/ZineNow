## Intro

The tool offers two **models** (trained neural networks) that decide, for every pixel, how likely it is to belong to the main subject. **U²-Netp** (Apache-2.0, 4.4 MB) copes with any single subject: an object, an animal or a person, with slightly rough edges. **MODNet** (Apache-2.0, 25 MB) is made for **portraits** (head and shoulders) and gives soft, hair-like edges, but is not for objects or animals.

## How to use

1. **Remove background** in the tools list; choose **U²-Netp (General)** or **MODNet (Portrait)** and download it if needed.
2. *(Optional)* **Crop first…**: drag a box (corners, edges, or the inside to move it). Only what is inside is used, which also helps on a busy picture. Applying makes the picture the cropped area (Undo brings the whole picture back). **Reset the box** restarts it.
3. **Find subject.** The picture is shown with everything else see-through, over a checkerboard.
4. Adjust the cut ([Cut-off and softness](ai-tools/remove-background/cutoff-softness)) and press **Apply** (or **Discard**). Enter does the same as the main button. **Undo** goes back.
5. Save as **PNG** to keep the transparency (JPG has none).

## How it works

### Preparing the picture

Each model wants its input a particular way, written down as a small table:

| | U²-Netp | MODNet |
|---|---|---|
| square size | 320 | 512 |
| colour **mean** | 0.485, 0.456, 0.406 | 0.5, 0.5, 0.5 |
| colour **std** | 0.229, 0.224, 0.225 | 0.5, 0.5, 0.5 |
| scale colours by | the brightest value in the picture | 255 |
| answer turned into a mask by | "minmax" (stretched) | "clamp" (already 0 to 1) |

The picture is **squashed** to a square of that size (no cropping or padding), and each colour value is **normalised**: `(value ÷ scale − mean) ÷ std`. Normalising (centring the numbers around 0 with a spread of about 1) is what the model was trained on, so it must be repeated exactly.

### The answer

The model returns a grid of numbers, one per square pixel. **minmax** stretches the smallest to 0 and the biggest to 1; **clamp** just clips to between 0 and 1. The result is a **mask**: 0 is background, 1 is subject.

### Running

These models are quick on the **processor**, so the graphics chip is not used (it would spend longer compiling the model than it saves). The model is created once, kept in memory, and **released after one quiet minute** to free memory.

### Cutting

The mask is stretched back to the picture's size and used as the picture's **alpha** (opacity) with a canvas trick: draw the picture, then draw the mask on top with the mode `destination-in`, which keeps the existing picture only where the new drawing is opaque.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The preparation table and `segInput`

```js file=shared/js/ai/segment.js
// How each model wants its picture: the square size, the colour normalisation, whether colours are first scaled by the brightest value
// (U²-Netp) or by 255 (MODNet), and how its answer becomes a 0..1 mask ("minmax": stretched; "clamp": already 0..1).
export const SEG_PREP = {
  u2netp: { size: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225], byBrightest: true, mask: "minmax" },
  modnet: { size: 512, mean: [0.5, 0.5, 0.5], std: [0.5, 0.5, 0.5], byBrightest: false, mask: "clamp" },
};
```

```js file=shared/js/ai/segment.js fn=segInput,segMask
```

**The Logic:**
- `byBrightest` finds the largest red, green or blue value in the picture (`max`) and divides by that instead of 255, so a dark picture is stretched to the full range.
- The output list holds **three planes** one after another (all the reds, then greens, then blues): `out[c * n + i]` is channel `c` of pixel `i`. That channel-first layout is what the model expects.
- `segMask` with `"clamp"` clips; otherwise it finds the lowest and highest value (`lo`, `hi`), and `(v − lo) / (hi − lo)` stretches them to 0 and 1 (`hi - lo || 1` avoids dividing by zero).

**Worked example.** One orange pixel (255, 128, 0).
- U²-Netp: `max = 255` (the brightest value present), red `(255/255 − 0.485)/0.229 =` **2.249**, green `(128/255 − 0.456)/0.224 =` **0.205**, blue `(0/255 − 0.406)/0.225 =` **−1.804**.
- MODNet: red `(1 − 0.5)/0.5 =` **1**, green `(0.502 − 0.5)/0.5 =` **0.004**, blue `(0 − 0.5)/0.5 =` **−1**.
- `segMask([−5, 0, 5, 15], minmax)` → `[0, 0.25, 0.5, 1]` (range 20: `(0 − (−5))/20 = 0.25`). `segMask([−0.2, 0.4, 1.3], clamp)` → `[0, 0.4, 1]`.

(All checked by running the real functions.)

### Running the model: `segmentCanvas`

```js file=shared/js/ai/bgSession.js fn=acquire,segmentCanvas
```

**The Logic:** `acquire` keeps one session **per model**: a `Map` from model key to a Promise (the session while it is starting, which stops two clicks from starting it twice). If the model file is not saved it throws a clear error and **never downloads by itself**; downloads are only ever started by you ([The opt-in download flow](ai-tools/running-models/download-flow)). `segmentCanvas` draws the picture onto a small square canvas, builds the input **tensor** (an ONNX Runtime box of numbers with a shape: `[1, 3, size, size]` = one picture, three colour planes), runs the model, and converts the answer: `side = round(sqrt(length))` finds the mask's width from its number of values. `touch()` restarts the one-minute release timer.

### The crop box: `hitCrop`

```js file=apps/AiToolsLocal/src/tools/removeBackground.js fn=hitCrop
```

**The Logic:** given the crop box `c`, a point `pt`, and a tolerance `tol` (in picture pixels), it works out which part is under the pointer. `nearL`, `nearR`, `nearT` and `nearB` say whether the point is within `tol` of each edge; `inX` and `inY` whether it is within the box's span. Corners (two "near"s) win first, then edges, then the inside ("move").

**Worked example.** Box `{ x: 100, y: 100, w: 200, h: 150 }`, zoom 0.5, so `tol = 18 / 0.5 =` **36** picture pixels:
| Pointer | Part |
|---|---|
| (105, 102) | `nw` (corner) |
| (200, 100) | `n` (top edge) |
| (200, 175) | `move` (inside) |
| (400, 400) | none |

Handle size and tolerance are divided by the zoom so they stay the same size on screen.

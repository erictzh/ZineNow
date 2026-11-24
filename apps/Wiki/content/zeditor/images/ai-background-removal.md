## Intro

**AI Background Removal** makes everything except the main subject of a picture see-through, using a small artificial-intelligence model that runs **on your own device**: nothing is uploaded. It is an **experimental** feature: it is hidden until "Experimental AI features" is switched on in the Display gear, and each model is a download you choose to make.

## How to use

1. Switch on **Experimental AI features** (the gear at the bottom left of ZEditor, or the Home page).
2. Select an image: Format panel → **AI Background Removal**.
3. Choose a **model**: *U²-Netp (General)*, 4.4 MB, for one subject of any kind; or *MODNet (Portrait)*, 25 MB, for head-and-shoulders photos with soft hair edges.
4. Press **Download** (a pop-up shows the licence, size and where it comes from; you can **Cancel** a download or **Delete** a model later). It then works offline.
5. Set the **Edge cut-off (%)** (default 0.1; type finer values like 0.125) and **Soft edge (%)**, then **Remove background**. Not right? **Undo**, change the numbers, run again.
- For more tools (face blur, click-to-select, upscale, text from image) the same image can be sent to **Ai Tools (Local)** from the panel; the result comes back as a new layer.

## How it works

### The model

A **neural network** is a large chain of simple arithmetic steps whose numbers (**weights**) were found by training on many example pictures. Here the network is shown a picture and answers, for every pixel, **how likely it is to belong to the main subject**: a **matte** or **mask** from 0 (background) to 1 (subject). The task is called **salient object detection** (U²-Netp) or **portrait matting** (MODNet).

### ONNX and the browser

The models are stored in the **ONNX** format (a standard file format for neural networks) and run by **ONNX Runtime Web**, a library that executes them in the page. For these two models the *processor* is used (WASM): they are small, and the graphics chip would spend longer preparing than it would save. The model is kept in memory only while in use and released after a quiet minute. (How models are downloaded and stored is in [Running models in the browser](ai-tools/running-models).)

### Preparing the picture

The models work on a fixed-size square: U²-Netp **320 × 320**, MODNet **512 × 512**. The picture is first **baked** (crop, adjustments, filters and effects applied: what you see), drawn onto a small square canvas, and each pixel is **normalised**: converted to a number the network expects. For U²-Netp the colours are first divided by the picture's brightest value, then the average colour is subtracted and the result divided by a spread (`(value − mean) / std`, the **standardisation** used in training); MODNet divides by 255 and uses mean and spread of 0.5.

### From matte to see-through

The model's answer is a list of numbers on the small square. It is **normalised** to 0–1 and then turned into see-through-ness with the two sliders:
- **Cut-off:** a matte value at or below it is **fully see-through**; the background gets small but non-zero values from the model, so a very small cut-off (like 0.1%) already removes it.
- **Soft edge:** above the cut-off, the picture fades in over this much of the range, then is fully solid. The fade only goes *upwards* from the cut-off, so the background (just below it) never stays half-visible.

The result is stretched back to the picture's real size and **multiplied into the picture's alpha channel** with the compositing rule `destination-in` ("keep only where the mask is"), as with [clipping masks](zeditor/arrange/clipping-masks).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `softCut`

```js file=shared/js/ai/segment.js fn=softCut
```

**The Logic:** with a cut-off of 0 nothing is cut (returns 1: fully visible). Otherwise `width` is the fade width: `soft`, but never wider than the room left above the cut-off (`1 − cutoff`) and never zero (`Math.max(0.0001, …)` avoids a division by zero). `a = (v − cutoff) / width` is how far into the fade the value is: below 0 means at or under the cut-off (`a < 0 ? 0`), above 1 means past the fade (`a > 1 ? 1`), and between is the fraction itself: a linear ramp.

**Worked example (real numbers).** Cut-off 0.1, soft 0.1: a matte value 0.05 → **0** (background gone); 0.1 → **0** (at the cut-off); 0.15 → **0.5** (half see-through); 0.2 → **1** (solid). Cut-off 0.9 and soft 0.5: the room is only `1 − 0.9 = 0.1`, so the width is 0.1: 0.95 → **0.5**. Cut-off 0 keeps everything, whatever the matte says. (These are matte values from 0 to 1. The panel's *Edge cut-off (%)* is divided by 100 first, so its default of 0.1% is a matte value of 0.001, which already removes the model's small background values.)

### `segInput` and `segMask`

```js file=shared/js/ai/segment.js fn=SEG_PREP,segInput,segMask
```

**The Logic:**
- `SEG_PREP` records what each model needs: size, **mean** and **std** for each of red, green, blue, whether to divide by the brightest value, and how to read the answer (`"minmax"` stretch or `"clamp"`).
- `segInput(rgba, prep)` builds the network's input: a flat list of `3 × size × size` decimal numbers (`Float32Array`), laid out **channel by channel** (all the reds, then all the greens, then all the blues: the layout a network expects, "CHW"), each `(value / max − mean) / std`. For U²-Netp, `max` is the brightest red, green or blue found in the picture (a loop with comparisons); otherwise 255.
- `segMask(data, how)`: for `"clamp"` (MODNet's answer is already 0–1) each value is squeezed into 0–1. For `"minmax"` the lowest and highest values are found and each is rescaled: `(v − lo) / (hi − lo)`, so the smallest becomes 0 and the largest 1 (`hi − lo || 1` avoids a division by zero).

**Worked example.** One orange pixel (200, 100, 50). U²-Netp, brightest value in the picture 255: red `(200 / 255 − 0.485) / 0.229 =` **1.307**, green `(100 / 255 − 0.456) / 0.224 =` **−0.285**, blue `(50 / 255 − 0.406) / 0.225 =` **−0.933**. MODNet: `(200 / 255 − 0.5) / 0.5 =` **0.569**, **−0.216**, **−0.608**. A min-max stretch of the answers `[0.2, 0.5, 0.8]` gives `[0, 0.5, 1]`.

### `cutOutCanvas`

```js file=shared/js/ai/bgSession.js fn=cutOutCanvas
```

**The Logic:** a small canvas `m` the size of the mask is made; `maskToAlpha` turns each mask value through `softCut` into an alpha byte (0–255). The mask picture is white with that alpha (only the alpha matters). A full-size copy `out` of the original is drawn; then `globalCompositeOperation = "destination-in"` and the small mask picture is drawn over it, **stretched** to the full size with `imageSmoothingQuality = "high"` (smooth enlargement, so the cut edge is not blocky). Where the mask is see-through, the picture becomes see-through; where it is solid, the picture stays.

### `handleRemoveBackground`

```js file=apps/ZEditor/src/state/useAnnotationEdits.js fn=handleRemoveBackground
```

**The Logic:** it first **flattens** the image (`flattenedImagePatch`: crop, adjustments and effects baked in), so the model sees what you see. The baked picture is loaded into an `Image` (wrapped in a Promise so it can be `await`ed) and drawn onto a canvas. `segmentCanvas` runs the model and returns the matte; `cutOutCanvas` makes the cut-out; the result replaces the item's picture (`src: out.toDataURL("image/png")`, PNG keeps the see-through). It is **one undo step**, via `updateAnnotationsFor`. A `throw new Error(...)` is used if nothing is visible.

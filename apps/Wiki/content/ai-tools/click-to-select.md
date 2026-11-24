## Intro

**Click-to-select** outlines whatever you click on. The model is **MobileSAM** (a compact version of Meta's "Segment Anything", Apache-2.0, two files of 28.2 and 16.5 MB). It first **reads the whole picture once** (slow), then each click is answered almost instantly. You can add to the selection, take away from it, and then **cut it out**, make it **see-through**, or **send it to Remove object** as the marks to fill.

## How to use

1. **Read the picture** (about 7 s with a graphics chip, 11 s without; the message says so). Read it again after you change the picture.
2. **Click** on a thing: a green dot appears and it is outlined in orange. Too little or too much? **Add to selection** (green dots) or **Take away** (red dots) and click again. **Remove the last click** and **Clear the selection** undo clicks.
3. Use it: **Cut it out** (keep only the selection), **Make it see-through** (remove only the selection), or **Send to Remove object**. Undo brings the picture back.
- Pictures are read at most 1280 px on the long side; the selection is scaled back up.

## How it works

SAM has two parts:
- the **image reader** (*encoder*): turns the picture into **embeddings**, a compact grid of numbers describing what is where. Slow, done **once per picture**.
- the **mask maker** (*decoder*): takes the embeddings **plus your clicks** and outputs a mask. Fast, so every click gives instant feedback.

### Preparing

The picture is shrunk so its long side is 1024 (`k` is the factor), sent as plain 0 to 255 RGB. Clicks are multiplied by `k` to land in the model's coordinates; each click has a **label**: 1 (include) or 0 (exclude), and a final pad point with label −1 means "no box".

### The answer

The decoder may give several candidate masks with a **quality score** (IoU) each; the best-scoring one is used. A value above 0 means "selected". The mask comes at the model's size and is stretched to the picture's size with smoothing (the soft edge).

### Only the latest clicks count

If you click quickly, only one decode runs at a time; clicks made meanwhile set a flag so it **runs again** with the full set of clicks when it is done.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The maths: `samDims`, `samPoints`, `pickMask`

```js file=shared/js/ai/sam.js fn=samDims,samPoints,pickMask
```

**The Logic:** `samDims` finds `k = 1024 / longest side` and the new width and height (at least 1). `samPoints` creates two flat lists: `coords` (x, y per point, times `k`) and `labels`, with one extra entry at the end whose label is −1. `pickMask`: the data is `kk` masks of `mh × mw` values one after another; `best` starts at 0 and moves to any mask with a higher quality `iou[i]`; then every value above 0 in the chosen mask sets a 1 in the answer, and `coverage` is the share of pixels selected.

**Worked example.** `samDims(4000, 3000)` → `k = 0.256`, **1024 × 768**. `samDims(800, 1200)` → `k = 0.8533`, **683 × 1024**. Clicks `(100, 200)` add and `(50, 60)` take away with `k = 0.5`: coords `[50, 100, 25, 30, 0, 0]`, labels `[1, 0, −1]`, `n = 3`. A 2-mask answer `[−1, 1, −1, 1]` and `[2, 2, −2, −2]` (each 2 × 2) with quality `[0.5, 0.9]`: the second mask is best, so the selection is `[1, 1, 0, 0]`, **coverage 0.5**.

### Reading the picture and outlining

```js file=shared/js/ai/samSession.js fn=prepareSam,outline
```

**The Logic:** `prepareSam` starts the two sessions if needed (the encoder on the **graphics chip when it works**, the decoder on the processor), draws the shrunk picture, makes a tensor of shape `[height, width, 3]`, runs the encoder, and returns the **embeddings** with `k`. If the graphics chip fails it **falls back** to the processor and tries again. `outline` builds the decoder's inputs by name (`image_embeddings`, `point_coords`, `point_labels`, plus optional `mask_input` and `has_mask_input` zeros and `orig_im_size` if the model asks for them: `has(name)` checks the model's declared inputs), runs it, finds the output called `masks` and the quality output, and calls `pickMask`.

### The tool: reading and decoding

```js file=apps/AiToolsLocal/src/tools/selectObject.js
    async function decode() {
      if (deciding) { again = true; return; }
      deciding = true;
      try {
        do {
          again = false;
          if (!points.length) { sel = null; break; }
          const r = await outline(prep, points.map((p) => ({ x: p.x * prep.scale, y: p.y * prep.scale, label: p.label }))); // the read size's pixels
          sel = { mask: r.mask, w: r.w, h: r.h };
          ctx.debug.log("Click " + points.length + ": decoder " + r.ms + " ms, selected " + (100 * r.coverage).toFixed(1) + " % of the picture, quality " + r.iou.map((v) => v.toFixed(2)).join(","));
          ctx.status("Selected " + (100 * r.coverage).toFixed(1) + " % of the picture (" + r.ms + " ms). Click more to add" + (addMode ? "" : " (taking away)") + ", or use the selection below.", "ok");
          drawSelection();
        } while (again);
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { deciding = false; drawSelection(); refresh(); }
    }
```

**The Logic:** the `deciding` and `again` flags make a small queue: if a decode is running, `decode()` just sets `again` and returns; the `do … while (again)` loop repeats with the newest `points`. Clicks are multiplied by `prep.scale` (the work picture is at most 1280 px). Each result updates the selection overlay and the status with the **coverage** percentage.

### Using the selection

```js file=apps/AiToolsLocal/src/tools/selectObject.js
    async function apply(keep) { // keep: the selection stays and the rest becomes see-through; else the selection becomes see-through
      if (!sel || picture.busy) return;
      picture.setBusy(true);
      try {
        const before = await picture.snapshot();
        const { data } = selectionAtPictureSize();
        const img = picture.ctx.getImageData(0, 0, picture.width, picture.height);
        for (let i = 0; i < data.length; i += 4) { const a = data[i + 3] / 255; img.data[i + 3] = Math.round(img.data[i + 3] * (keep ? a : 1 - a)); }
        picture.ctx.putImageData(img, 0, 0);
        picture.commit(before);
        ctx.debug.log("Click-to-select: " + (keep ? "cut out the selection" : "made the selection see-through"));
        reset(true);
        ctx.status(keep ? "Cut out: only the selection is left (everything else is see-through). Undo brings it back." : "Done: the selection is see-through. Undo brings it back.", "ok");
      } catch (e) { ctx.status("Something went wrong: " + (e && e.message ? e.message : e), "bad"); }
      finally { picture.setBusy(false); }
    }
```

**The Logic:** `selectionAtPictureSize` draws the selection mask stretched to the picture's size; its alpha `a` (0 to 1, soft at the edge from the stretch) multiplies the picture's own alpha: `keep ? a : 1 − a`. So **Cut it out** keeps the selected area (alpha × a) and **Make it see-through** keeps the rest (alpha × (1 − a)).

**Worked example.** A selected pixel (a = 1) of an opaque picture (alpha 255): Cut out → 255, See-through → 0. An edge pixel with a = 0.4: Cut out → `round(255 × 0.4) = 102`, See-through → `round(255 × 0.6) = 153`. **Send to Remove object** turns pixels with alpha ≥ 128 (`≥ 50%`) into marks.

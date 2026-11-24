## Intro

**Colour quantizing** reduces a picture with millions of colours to a handful. Vectorize needs this because a vector shape has *one flat colour*; a photo's gradual changes have to become a few areas of solid colour, like a screen-print or a poster. This is the first stage of tracing.

## How to use

In the Vectorize panel: **Mode** is *Black & white* (one **Threshold**), *Shades of grey* or *Colour* (both with a **Colours** slider, 2–16). **White areas** can be kept as shapes or left see-through. Fewer colours give a flatter, more poster-like result.

## How it works

### Black and white: a threshold

Each pixel's **luma** (brightness; see [Luma](zeditor/pages/page-filter/luma)) is compared to the threshold: darker is black (label 0), otherwise white (label 1). Raise the threshold and more of the picture becomes black.

### Colour: k-means clustering

For colour, the problem is: *pick k colours that best represent the picture*. The classic solution is **k-means clustering**:
1. Treat every pixel as a point in 3-D **colour space** (its red, green and blue are the coordinates).
2. Start with *k* guesses for the cluster centres.
3. **Assign** every pixel to its nearest centre (smallest squared distance).
4. **Move** each centre to the **average** of the pixels assigned to it.
5. Repeat 3 and 4 until the centres stop moving (or after 12 rounds).

The centres are the palette; each pixel's label is its nearest centre.

### Details that make it fast and stable

- **Sampling.** Running over millions of pixels is slow, so about **20,000** evenly spread pixels are used to *find* the colours; every pixel is only labelled afterwards.
- **A fixed start.** Normally k-means starts at random places, giving a different answer each time. Here the samples are **sorted by brightness** and the starting centres are picked evenly along that order, so the same picture always gives the same colours.
- **Empty clusters** restart at the sample furthest from its centre, so no colour is wasted.
- **Transparent pixels** (alpha below 128) are always see-through (label −1).
- **Palette order.** At the end the labels are renumbered so colour 0 is the most used, unused colours are dropped and identical colours merged. Drawing the biggest area first (at the bottom) is what makes the overlap method work.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `quantizePixels`

```js file=apps/ZEditor/src/model/trace/quantize.js fn=quantizePixels
```

**The Logic:**
- `pixels` is `{ width, height, data }` (four numbers per pixel). `labels` is an `Int16Array` (whole numbers from −32768 to 32767, 2 bytes each) filled with −1: "see-through". `opaque(i)` and `lum(i)` are small helper functions reading pixel `i`.
- *Black and white:* the palette is fixed (`[[0,0,0],[255,255,255]]`); each opaque pixel gets 0 if its luma is below the threshold, else 1.
- *Grey or colour:* `colorOf(i)` gives a pixel's colour (its luma three times for grey). `kMeans(samplePixels(...), k)` finds the centres; the palette is those centres rounded; each opaque pixel is labelled by `nearest`.
- *Ignore white:* if chosen, a palette colour with red, green and blue all above 225 counts as "white" and every pixel with that label becomes −1.
- `sortedByUse` renumbers by popularity and returns `{ labels, palette }`.

**Worked example (real output).** Three pixels: dark grey (20), light grey (200) and a fully see-through one, Black & White with threshold 128: labels **[0, 1, −1]**, palette `[[0,0,0],[255,255,255]]`: `20 < 128` is black, `200 ≥ 128` is white, the third is see-through.

### `kMeans`

```js file=apps/ZEditor/src/model/trace/quantize.js fn=kMeans
```

**The Logic:**
- With no samples it returns black. `byLum` is the samples sorted by `r + g + b` (`.sort` with a comparison function; `.slice()` first so the original order is kept). `n = Math.min(k, samples.length)` handles pictures with fewer colours than requested.
- The starting `centers` are picked evenly along the brightness order: item `floor(((j + 0.5) / n) × length)` for each `j`. The `+ 0.5` centres each pick in its share of the list.
- The loop runs at most 12 **iterations**. `sums` collects, for each centre, the total red, green, blue and the count of samples assigned to it. For each sample: find the nearest centre `k2`, add the sample to its sum, and remember the sample furthest from its centre (`far`, used for empty clusters).
- Each centre moves to its average (`r / m`, `g / m`, `b / m`), or to `far` if no sample was assigned. `moved` records the largest movement (squared distance); if it is below 0.25 (about half a colour step) the centres have settled and the loop `break`s early.

**Worked example (real output).** Four grey samples `(0,0,0)`, `(10,10,10)`, `(240,240,240)`, `(250,250,250)`, k = 2. Sorted by brightness they are already in order. Starting centres: item `floor(0.25 × 4) = 1` → (10,10,10) and item `floor(0.75 × 4) = 3` → (250,250,250). Round 1: (0,0,0) and (10,10,10) go to the first centre, the other two to the second; the centres move to the averages (5,5,5) and (245,245,245). Round 2: nothing changes, so it stops. Result: **`[[5,5,5],[245,245,245]]`**. For four colour samples (255,0,0), (250,10,10), (0,0,255), (5,5,240) and k = 2, the palette is **`[[253,5,5],[3,3,248]]`**: a red and a blue, labels `[0, 0, 1, 1]`.

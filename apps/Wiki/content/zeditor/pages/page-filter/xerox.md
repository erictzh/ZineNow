## Intro

**Xerox** makes a picture look like a worn photocopy: very high contrast, speckles of toner, dark streaks running down the page, and ink worn away near the edges. It is available for **single images** (not as a page filter) and is built for zine covers and collage.

## How to use

Select an image, then in the Format panel set its **Filter** to **Xerox**. Sliders (all 0–100):
- **Contrast** (default 75) and **Exposure** (default 50): the black-and-white look. More exposure makes the picture lighter.
- **Toner speckle** (35): grain over the picture, and stray black or white dots.
- **Streaks** (25): vertical dark lines, and a few pale bands.
- **Edge wear** (30): ink gone near the borders.
- **Variation** (0): change it for a different random pattern at the same settings.
- **Ink color** and **Paper color**: black on white by default.

## How it works

Each pixel goes through five steps.

1. **Brightness** `lum` (0–1) from [luma](zeditor/pages/page-filter/luma).
2. **A steep contrast curve.** `tone = clamp((lum − cutoff) × gain + 0.5)`, where `gain = 1 + contrast/100 × 15` and `cutoff = 1 − exposure/100`. With the default contrast of 75 the gain is 12.25: a tiny change in brightness near the cutoff swings the tone from black to white, which makes the picture nearly two-tone. **Exposure** moves the cutoff: at 0 the cutoff is 1, so almost everything is dark; at 100 it is 0, so almost everything washes out to paper. The curve is clamped *first*, or blacks and whites would sit so far out of range that the next steps could not show.
3. **Speckle.** Random noise of up to `±speckle/2` is added to the tone, and about `speckle × 3%` of cells get a **pinhole**: stray toner on white, or a gap in solid black (the tone is flipped).
4. **Streaks.** Each column of pixels draws a noise number. The top `0.2 × streaks%` of columns get a dark offset and half as many get a pale one, and a column's own noise sets how strong it is. The slider sets how many, not how dark.
5. **Edge wear.** Within 10% of the shortest side of the image, a pixel may turn to paper with a chance that grows with the **square** of the closeness to the edge, so the wear is dense at the very edge and fades quickly.

Finally the tone picks a colour between ink and paper by **linear interpolation**.

### Repeatable randomness

The "random" numbers are not `Math.random()`. They come from a small **hash**: `seededNoise(i, variation, j) = fract(sin((i + variation × 97) × 12.9898 + j × 78.233) × 43758.5453)`, a well-known one-liner for cheap, deterministic noise. The same cell always gets the same number, so the picture never flickers while you edit, and no seed needs to be stored. **Variation** just shifts where the hash starts reading.

### The same pattern on screen and in the PDF

Noise is keyed to **image-space cells** (`Math.floor(imageX)`), not canvas pixels: pixel coordinates are divided by `scaleFactor` first. So the lower-resolution preview and the higher-resolution export show the same speckles in the same places, only finer in the export.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `seededNoise`: repeatable "randomness"

```js file=apps/ZEditor/src/model/noise.js fn=seededNoise
```

**The Logic:** `Math.sin(...)` of a big, odd-looking number, multiplied by 43758.5453, gives a value that jumps around wildly for neighbouring inputs. `v - Math.floor(v)` keeps only the **fractional part** (the digits after the decimal point), a number from 0 up to 1. The result looks random but is a pure function: the same inputs `(i, variation, j)` always give the same number. The magic numbers 12.9898, 78.233 and 43758.5453 are a famous recipe from computer graphics for scrambling. `j = 0` is a **default parameter**: used when the caller leaves it out.

### `applyXerox`

```js file=apps/ZEditor/src/render/filters/xerox.js fn=applyXerox
```

**The Logic**, in order:
- **Settings.** `controlValues(...)` returns the slider values; they are turned into working numbers: `gain = 1 + contrast / 100 * 15` (1 to 16), `cutoff = 1 - exposure / 100`, and the other sliders become fractions from 0 to 1. `imageW`/`imageH` are the size in editor pixels (`width / scaleFactor`); `wearZone` is 10% of the shorter side.
- **Streaks.** `streakShift` is a `Float32Array` (a typed list of decimal numbers) with one entry per pixel column. Each column hashes its position (`Math.floor(x / scaleFactor / 2.5)`: a streak is about 2.5 editor pixels wide). If the noise is in the top `darkShare` of its range the column is darkened (negative shift), if in the bottom `paleShare` lightened. The shares come from the slider, so the slider chooses *how many* columns, and each column's own noise *how strongly*.
- **The pixel loop.** `i = (y * width + x) * 4` finds a pixel in the flat array (row number times row width plus column, times four numbers per pixel). `lum` is its brightness as 0–1.
- **Contrast curve.** `(lum - cutoff) * gain + 0.5` stretches brightness around the cutoff; the wrapping `Math.min(1, Math.max(0, ...))` clamps it into 0–1, **before** noise is added, so extremes can still be roughened.
- **Speckle and streaks.** The tone is nudged by noise (`seededNoise(...) - 0.5` ranges from −0.5 to +0.5, times the speckle amount) and by the column's shift. Pinholes: a different hash (with big prime offsets 7919 and 104729 so it is unrelated to the first) below `speckle * 0.03` flips the tone (`tone > 0.5 ? 0 : 1`: dark becomes white, light becomes black).
- **Edge wear.** `edgeDistance` is the nearest distance to any of the four sides. Inside the wear zone, `worn = wearAmount * (1 - edgeDistance / wearZone) ** 2` grows towards the edge (squared, so it is gentle at first and strong at the edge); a pixel turns to paper (`tone = 1`) when its noise is below `worn`.
- **Colour.** The final tone, clamped again, picks a colour between ink and paper: `ink + (paper - ink) * tone` for each channel. `putImageData` writes the picture back.

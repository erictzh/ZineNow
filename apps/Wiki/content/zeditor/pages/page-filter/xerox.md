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

The contrast curve:

```js file=apps/ZEditor/src/render/filters/xerox.js
  const gain = 1 + contrast / 100 * 15;
  const cutoff = 1 - exposure / 100;
```

```js file=apps/ZEditor/src/render/filters/xerox.js
      let tone = Math.min(1, Math.max(0, (lum - cutoff) * gain + 0.5));
      tone += (seededNoise(cellX, xeroxVariation, cellY) - 0.5) * speckleAmount;
      tone += streakShift[x];
```

Pinholes:

```js file=apps/ZEditor/src/render/filters/xerox.js
      if (seededNoise(cellX + 7919, xeroxVariation, cellY + 104729) < speckleAmount * 0.03) {
        tone = tone > 0.5 ? 0 : 1;
      }
```

Edge wear, strongest at the edge:

```js file=apps/ZEditor/src/render/filters/xerox.js
        const worn = wearAmount * (1 - edgeDistance / wearZone) ** 2;
        if (seededNoise(cellX + 15485, xeroxVariation, cellY + 32452) < worn) tone = 1;
```

The repeatable "noise":

```js file=apps/ZEditor/src/model/noise.js
export function seededNoise(i, variation, j = 0) {
  const v = Math.sin((i + variation * 97) * 12.9898 + j * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
```

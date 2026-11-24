## Intro

**Halftone** is how printers fake shades of grey with ink that has only one strength: they print many small dots, big where the picture is dark and small where it is light. From a distance the eye blends them into tones. ZEditor's halftone redraws a page or image as exactly such a screen, in black ink or in full colour.

## How to use

*Page menu → Filter → Halftone → Customize…* (or an image's own Filter setting):
- **Color:** **Monochrome** (one ink) or **Full color (CMYK)** (four inks).
- **Screen:** **Dots / Lines** or **1-Bit Dither** (solid squares in a fixed pattern).
- **Dots ↔ Lines (%):** 0 is round dots, 100 is continuous lines; in between the dots stretch into lines. Hidden for dither.
- **Size (px):** the width of one cell, 1 to 16. Bigger cells give a coarser, more obvious pattern.
- **Angle (°):** the tilt of the grid, 0 to 180.
- **Ink color:** the dot colour (monochrome only).

## How it works

### Amplitude-modulated halftone

The canvas is cut into a grid of square **cells**. For each cell the code averages the brightness of its pixels, then draws **one mark** whose size says how dark the cell is: radius `= (1 − lightness) × maxRadius`, with `maxRadius = 0.62 × cellSize`. A dark cell gets a big dot (up to 62% of the cell's width, so neighbours overlap and fill it), a light cell a tiny one. Changing the **size** of the dot, not the number of dots, is called **amplitude modulation (AM)**, and it is what newspapers use. The marks go on a white sheet, replacing the image entirely, like a real printing plate.

### The rotated grid

The grid is laid out in a rotated coordinate space `(u, v)`: the canvas is rotated by the **Angle**, and the cell centres are computed there. To cover the whole canvas after rotation, the loop finds the extremes of the four rotated corners. Printers always tilt a grid because a straight 0° grid shows up as a visible pattern; 45° is the classic angle for black.

### Dots to lines

The **Dots ↔ Lines** slider blends the half-width of the mark from the dot's radius to the cell's full half-width, and the half-height from the radius to `(1 − lightness) × cellSize / 2`. At 0 it is a circle; at 100 it is a bar as wide as the cell and as tall as the darkness, so neighbouring cells join into **lines** whose thickness shows the tone.

### 1-bit dither: ordered dithering

For the dither screen each cell is either filled or empty. The decision uses an **8×8 Bayer matrix**, a fixed table of the numbers 0 to 63 arranged so that thresholds are spread evenly. A cell is filled when its lightness is below the matrix number at its position (scaled to 0–1). It is called **ordered dithering**, and it makes the cross-hatch pattern of early computer graphics.

### Full colour: four plates

CMYK printing uses four inks: **C**yan, **M**agenta, **Y**ellow and blacK. The colour mode draws the same screen four times, once per ink, each sized by how much of that ink the cell needs (`cmykCoverage`): `k = 1 − max(r, g, b)`, and each of C, M, Y is `(1 − channel − k) / (1 − k)`. The four plates are drawn with the **multiply** blend, which darkens like real overprinted ink: cyan over yellow gives green. Each plate is tilted differently (**15°, 75°, 0°, 45°** on top of your angle), a rule from print: stacked screens at the same angle would clash and make a moiré pattern, while screens at different angles blend into small "rosettes".

### Why dots are not batched

Lines and dither squares are added to one path and filled in batches of 4096, so neighbours join without seams and a very fine screen does not build one enormous path. Pure dots are filled **one at a time** on purpose: where they overlap, the overlap is what gives a dot screen its tone, and batching would lighten it.

### Resolution

The cell size is in editor pixels; the dispatcher multiplies it by the `scaleFactor` so the export uses the same pattern at a finer resolution. At export scale the cell size is fractional, so the pixel sampling uses whole-pixel bounds (a fractional index into the data array would be `undefined` and turn the average into `NaN`).

## Code

The dot's size from its cell's lightness:

```js file=apps/ZEditor/src/render/filters/halftone.js
      const radius = (1 - avgLum) * maxRadius;
      const halfLength = radius + (cellSize / 2 + 0.25 - radius) * toLine;
      const halfHeight = radius + ((1 - avgLum) * cellSize / 2 - radius) * toLine;
```

The four CMYK plates and their screen angles:

```js file=apps/ZEditor/src/render/filters/halftone.js
const CMYK_PLATES = [
  { ink: "#00ffff", angleOffset: 15, channel: 0 },
  { ink: "#ff00ff", angleOffset: 75, channel: 1 },
  { ink: "#ffff00", angleOffset: 0, channel: 2 },
  { ink: "#000000", angleOffset: 45, channel: 3 },
];
```

How much of one ink a colour needs:

```js file=apps/ZEditor/src/render/filters/halftone.js
function cmykCoverage(r, g, b, channel) {
  const k = 1 - Math.max(r, g, b);
  if (channel === 3) return k;
  if (k >= 1) return 0;
  return (1 - [r, g, b][channel] - k) / (1 - k);
}
```

The plates multiply together like overprinted ink:

```js file=apps/ZEditor/src/render/filters/halftone.js
  ctx.globalCompositeOperation = "multiply";
  for (const plate of CMYK_PLATES) {
```

Ordered dithering with an 8×8 Bayer matrix:

```js file=apps/ZEditor/src/render/filters/halftone.js
        if (avgLum < (BAYER_8X8[gridV & 7][gridU & 7] + 0.5) / 64) {
```

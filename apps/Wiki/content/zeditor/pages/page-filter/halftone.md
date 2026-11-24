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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The two tables the screens use

```js file=apps/ZEditor/src/render/filters/halftone.js fn=BAYER_8X8,CMYK_PLATES
```

**The Logic:** `BAYER_8X8` is an array of arrays: an 8 × 8 grid of the numbers 0–63, in the **Bayer** order that spreads thresholds evenly. `CMYK_PLATES` is a list of four small objects, one per ink, each with its colour, extra angle and the colour channel it measures (0 = cyan … 3 = black).

### `cmykCoverage`: how much of one ink is needed

```js file=apps/ZEditor/src/render/filters/halftone.js fn=cmykCoverage
```

**The Logic:** red, green and blue are numbers from 0 to 1. `k = 1 - Math.max(r, g, b)` is the black needed: the darkest-possible colour is the one where even the strongest channel is weak. For black (`channel === 3`) that is the answer. For pure black (`k >= 1`) the colours need no ink. Otherwise `(1 - [r, g, b][channel] - k) / (1 - k)` gives the share of cyan (channel 0, from red), magenta (1, from green) or yellow (2, from blue): `[r, g, b][channel]` picks one of the three numbers by position.

### `drawHalftoneScreen`: one plate or four

```js file=apps/ZEditor/src/render/filters/halftone.js fn=drawHalftoneScreen
```

**The Logic:** it paints the whole canvas white (the paper), then calls `drawHalftonePlate` once for a single ink, or, for full colour, once per plate. `ctx.save()` and `ctx.restore()` bracket a change of drawing state so it does not leak out. `globalCompositeOperation = "multiply"` makes each new plate **multiply** with what is already there, like transparent ink overprinting: the mix of cyan and yellow is green. `(angle + plate.angleOffset) % 180` tilts each plate differently (the remainder keeps it under 180).

### `drawHalftonePlate`: the heart of it

```js file=apps/ZEditor/src/render/filters/halftone.js fn=drawHalftonePlate
```

**The Logic**, in order:
- **Setup.** `controlValues` reads the settings. `maxRadius = cellSize * 0.62` is the biggest a dot can be. `radians = angle * Math.PI / 180` converts degrees to radians (the unit trigonometry uses; π radians = 180°). `cos` and `sin` of that angle are the numbers that rotate a point.
- **Covering a rotated grid.** The grid lives in a rotated frame `(u, v)`. `us` and `vs` rotate the four canvas corners into it; their smallest and largest values give the range the loops must cover. Without this, the rotated grid would leave empty triangles at the corners.
- **Batching.** A canvas **path** is a shape under construction; `ctx.fill()` paints it. Filling 100,000 dots one by one is slow, so lines and dither squares are collected into one path and filled every 4096 (`batchSize`). `markAdded` counts them. Pure dots are filled one at a time, because overlapping dots build up tone.
- **The two loops** (`gridV` for rows, `gridU` for columns) visit every cell. `centerU`/`centerV` is the cell's centre in the rotated frame; `cx`, `cy` rotate it back to canvas pixels (the usual rotation formula: `u·cos − v·sin`, `u·sin + v·cos`).
- **Measuring the cell.** `x0..x1`, `y0..y1` are whole-pixel bounds of the cell, kept inside the canvas (`Math.max(0, ...)`, `Math.min(width, ...)`). Two nested loops add up the brightness (monochrome) or the red/green/blue (colour) of every pixel in the cell; `count` counts them. Colour is blended over white by alpha, like `lumaOverWhite`. `continue` skips to the next cell if there were no pixels.
- **Lightness.** `avgLum` is the average brightness from 0 (black) to 1 (white); for a colour plate it is `1 - coverage`.
- **Dither:** the cell gets a square if its lightness is below the Bayer number for its place, `BAYER_8X8[gridV & 7][gridU & 7]`. `& 7` is a **bitwise AND** with 7 (binary 111): it keeps the last three bits, which is the same as "remainder after dividing by 8", so the 8 × 8 table repeats across the picture.
- **Dots and lines:** `radius = (1 - avgLum) * maxRadius`, bigger for darker cells. `toLine` (0 to 1) blends the half-width and half-height from the dot's radius towards a line's. If the mark would be thinner than 0.4 px (`halfHeight > 0.4`) it is skipped. `ctx.arc` adds a circle to the path; `ctx.roundRect` adds a rounded rectangle whose corner rounding shrinks to zero as lines take over (`1 - toLine`).
- Finally `ctx.fill()` paints what remains in the path, and `ctx.restore()` undoes the rotation.

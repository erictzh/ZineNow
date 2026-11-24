## Intro

**Colour remap** is the family of filters that change each pixel's colour on its own, without looking at its neighbours: **Grayscale**, **Duotone** and **Threshold**.

## How to use

In *Page menu → Filter → Customize…*, or an image's own Filter setting:
- **Grayscale:** no settings.
- **Duotone:** choose a **Dark tone** and a **Light tone** (defaults `#1a1a1a` and `#ffe066`). Shadows take the dark colour, highlights the light one.
- **Threshold:** **Cutoff** (0–255, default 128), **Ink color** and **Paper color**. Pixels brighter than the cutoff become paper, the rest ink. Slide the cutoff right to get more ink, left for less.

## How it works

### Grayscale

Each pixel's red, green and blue are all set to its [luma](zeditor/pages/page-filter/luma): the weighted brightness.

### Duotone: a gradient map

A duotone is a **gradient map**: brightness chooses a position on a two-colour gradient. With `lum` as brightness from 0 to 1, each channel is `dark + (light − dark) × lum`, which is **linear interpolation** (lerp) between the two tones. Black maps exactly to the dark tone, white to the light tone, and everything between is a blend. It is how two-colour screen-prints and risograph zines look.

### Threshold: binarization

Threshold converts a picture to **two colours only**. For each pixel, `luma >= level` gives paper, otherwise ink. This is the simplest form of **binarization**. The slider is a straight cut: at 128 the darker half of all possible brightnesses becomes ink; at 255 nearly everything becomes ink; at 0 everything becomes paper. A photo with soft gradients turns into hard shapes, which is the point: it photocopies well. Transparent areas count as white (see [Luma](zeditor/pages/page-filter/luma)), so they become paper.

### In place

All three loop over every pixel of the `ImageData` array (4 numbers per pixel: R, G, B, A) and write the result back, so the filter costs one pass and no extra memory.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `applyColorRemap`: grayscale, duotone and threshold

```js file=apps/ZEditor/src/render/filters/colorRemap.js fn=applyColorRemap
```

**The Logic:**
- `ctx.getImageData(0, 0, width, height)` copies every pixel of the picture into memory; `data` is the array of numbers (four per pixel: red, green, blue, alpha). The function changes the numbers and writes them back at the end with `putImageData`.
- **Grayscale:** `for (let i = 0; i < data.length; i += 4)` is a **loop** that visits each pixel: `i` starts at 0 and jumps by 4, so it always lands on a pixel's red value. The brightness `lum` is the weighted sum of the three colour numbers, and `data[i] = data[i + 1] = data[i + 2] = lum` sets red, green and blue to that one value (chained `=` assigns right to left).
- **Duotone:** `hexToRgb` turns a colour like `#ffe066` into separate `r`, `g`, `b` numbers. `lum` is divided by 255 so it runs from 0 to 1. Then each channel is `dark + (light - dark) * lum`: at `lum = 0` that is the dark colour, at 1 the light one, and in between a proportional mix. That formula is called **linear interpolation** ("lerp").
- **Threshold:** `controlValues(filter, THRESHOLD_FILTER_CONTROLS)` reads the cutoff and colours, using each control's default if you have not set one. For each pixel, `lum >= level ? paper : ink` is a **ternary**: "if the brightness reaches the cutoff, paper, otherwise ink". Every pixel ends up one of two colours.
- `else if` chains make sure only one of the three branches runs.

**Worked example.** One pixel is a muddy orange: (200, 100, 50).
- **Grayscale:** `lum = 200 × 0.299 + 100 × 0.587 + 50 × 0.114 = 59.8 + 58.7 + 5.7 = 124.2`, so the pixel becomes (124, 124, 124).
- **Duotone** with the defaults dark `#1a1a1a` (26, 26, 26) and light `#ffe066` (255, 224, 102): `lum = 124.2 / 255 = 0.487`. Red = 26 + (255 − 26) × 0.487 = **137.5**, green = 26 + 198 × 0.487 = **122.4**, blue = 26 + 76 × 0.487 = **63**: a mid golden brown. At `lum = 0` the pixel is exactly `#1a1a1a`, at 1 exactly `#ffe066`.
- **Threshold** with the cutoff 128: `124.2 >= 128` is false, so the pixel becomes **ink**. A slightly brighter pixel with luma 130 would become **paper**. Drag the cutoff to 100 and the same pixel becomes paper.

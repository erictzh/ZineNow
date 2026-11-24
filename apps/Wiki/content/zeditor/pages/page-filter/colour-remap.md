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

Reading it:
- `ctx.getImageData(0, 0, width, height)` copies every pixel of the picture into memory; `data` is the array of numbers (four per pixel: red, green, blue, alpha). The function changes the numbers and writes them back at the end with `putImageData`.
- **Grayscale:** `for (let i = 0; i < data.length; i += 4)` is a **loop** that visits each pixel: `i` starts at 0 and jumps by 4, so it always lands on a pixel's red value. The brightness `lum` is the weighted sum of the three colour numbers, and `data[i] = data[i + 1] = data[i + 2] = lum` sets red, green and blue to that one value (chained `=` assigns right to left).
- **Duotone:** `hexToRgb` turns a colour like `#ffe066` into separate `r`, `g`, `b` numbers. `lum` is divided by 255 so it runs from 0 to 1. Then each channel is `dark + (light - dark) * lum`: at `lum = 0` that is the dark colour, at 1 the light one, and in between a proportional mix. That formula is called **linear interpolation** ("lerp").
- **Threshold:** `controlValues(filter, THRESHOLD_FILTER_CONTROLS)` reads the cutoff and colours, using each control's default if you have not set one. For each pixel, `lum >= level ? paper : ink` is a **ternary**: "if the brightness reaches the cutoff, paper, otherwise ink". Every pixel ends up one of two colours.
- `else if` chains make sure only one of the three branches runs.

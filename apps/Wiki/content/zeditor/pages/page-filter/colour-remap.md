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

Grayscale:

```js file=apps/ZEditor/src/render/filters/colorRemap.js
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
```

Duotone, a lerp per channel:

```js file=apps/ZEditor/src/render/filters/colorRemap.js
      data[i] = dark.r + (light.r - dark.r) * lum;
      data[i + 1] = dark.g + (light.g - dark.g) * lum;
      data[i + 2] = dark.b + (light.b - dark.b) * lum;
```

Threshold:

```js file=apps/ZEditor/src/render/filters/colorRemap.js
      const lum = lumaOverWhite(data, i);
      const c = lum >= level ? paper : ink;
```

The threshold's controls:

```js file=apps/ZEditor/src/model/pageFilters.js
  { kind: "slider", prop: "level", label: "Cutoff", min: 0, max: 255, fallback: 128 },
```

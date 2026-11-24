## Intro

**Luma** (luminance) is how bright a pixel looks, as one number from 0 (black) to 255 (white). Threshold, halftone and xerox all start by turning colour into luma, so one shared helper does it.

## How to use

You never use it directly: it is the first step inside Threshold, Halftone and Xerox, and in the Grayscale and Duotone previews.

## How it works

### Why not just average red, green and blue?

The eye is not equally sensitive to the three colours: it sees green as much brighter than blue. So the brightness is a **weighted sum** (the **Rec. 601** weights, from the old standard-definition TV standard):

`luma = 0.299 × R + 0.587 × G + 0.114 × B`

A pure green pixel is therefore far brighter than a pure blue one of the same strength, which matches how a black-and-white photo of them would look.

### Over white paper

A fully transparent pixel is stored as `(0, 0, 0, 0)`: black with zero alpha. Reading its colour alone would make see-through areas look **black**, so a halftone would fill them with dots. `lumaOverWhite` first blends the pixel over white, as if the image lay on a sheet of paper: `luma × alpha + 255 × (1 − alpha)`. Transparent means white, half-transparent means halfway.

### The same weights in the live preview

On screen, an image can show Grayscale or Duotone live without redrawing pixels, through an SVG filter. That filter needs the same weights as the canvas code, written as a 5×4 **colour matrix**, so both give identical results. They are stored side by side in this file so they cannot drift apart.

## Code

Luminance over white paper:

```js file=apps/ZEditor/src/render/filters/luma.js
export function lumaOverWhite(data, index) {
  const alpha = data[index + 3] / 255;
  const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  return luma * alpha + 255 * (1 - alpha);
}
```

The same weights as an SVG colour matrix:

```js file=apps/ZEditor/src/render/filters/luma.js
export const LUMINANCE_MATRIX_VALUES = "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0";
```

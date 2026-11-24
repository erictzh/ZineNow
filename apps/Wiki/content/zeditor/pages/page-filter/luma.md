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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `lumaOverWhite`

```js file=apps/ZEditor/src/render/filters/luma.js fn=lumaOverWhite
```

Reading it:
- `data` is the canvas's pixel array: a flat list of numbers, four per pixel in the order red, green, blue, alpha (each 0–255). `index` is where this pixel starts, so `data[index]` is its red, `data[index + 1]` its green, `data[index + 2]` its blue, `data[index + 3]` its alpha.
- `alpha = data[index + 3] / 255` turns opacity into a fraction from 0 (see-through) to 1 (solid).
- `luma` is the weighted brightness: 29.9% red, 58.7% green, 11.4% blue (the **Rec. 601** weights; they add up to 1, so white stays 255).
- `luma * alpha + 255 * (1 - alpha)` is a **weighted average** between the pixel's brightness and white, by how solid it is. This is how any picture would look over white paper.

### The same weights for the live preview

```js file=apps/ZEditor/src/render/filters/luma.js
export const LUMINANCE_MATRIX_VALUES = "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0";
```

Reading it: an SVG **colour matrix** has four rows (red, green, blue, alpha) of five numbers. Rows 1–3 each say "my output = 0.299 × R + 0.587 × G + 0.114 × B + 0 × A + 0", so all three channels become the same grey; row 4, `0 0 0 1 0`, keeps alpha unchanged. The matrix lets the browser grayscale an image on screen without any of our own code touching pixels.

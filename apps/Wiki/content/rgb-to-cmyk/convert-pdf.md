## Intro

**RGB to CMYK** is a small separate page that makes a PDF friendlier to a printer. Screens mix **R**ed, **G**reen and **B**lue light; printers mix **C**yan, **M**agenta, **Y**ellow and blac**K** ink. A PDF made on a screen usually says its colours in RGB, and the print shop or the printing software converts them, sometimes in surprising ways. This page does the conversion for you first, in a plain and predictable way. It all happens in your browser; the PDF is never uploaded.

It is a plain conversion, **not** a colour-managed one: it does not use a printer's colour profile (ICC), so it cannot promise the exact colours a proof would show.

## How to use

1. Open **RGB to CMYK** from the home page.
2. Drop a PDF on the box (or click it to choose one).
3. Choose what to convert (all on by default):
   - **Black and grey colours → black ink only.** Black text and lines print from the black plate alone, with no coloured fringes.
   - **Grey pictures → one channel.** A black-and-white page becomes one-channel grey, prints from black ink only and is much smaller.
   - **Colour pictures → CMYK.** A plain formula; colours come out a little duller than on screen.
4. Click **Convert**, read the short report (how many colours and pictures were changed or left alone, and the file sizes), then **Download the CMYK PDF**.

Good to know:
- **Black-and-white zines** get exactly what they need: everything on the black plate.
- A PDF from **ZEditor** is mostly one picture per page (text can be real text when the font file is reachable), so the page picture is what gets converted. A page that is only black, white and grey becomes a one-channel grey picture.
- Bright screen colours (neon, very saturated blues and greens) cannot be printed in CMYK at all. Ask your printer for a proof.
- Pictures that are already CMYK or grey, use a colour profile, JPEG compression, patterns or gradients are **left as they were**, and the report counts them.

## How it works

### The formula

`rgbToCmyk` takes red, green and blue (each 0 to 1). The black ink is `K = 1 - the brightest channel`. The other three inks are what remains of each channel after taking K out, scaled up. White becomes no ink at all; black becomes K only; a grey becomes K only.

### Drawing colours

A page's drawing instructions set colours with operators like `0.2 0.4 0.6 rg` (fill) and `RG` (stroke). `convertContentColours` finds these and rewrites them as `k` and `K`. When red, green and blue are equal it writes `0 0 0 K-amount k`, black ink only.

### Pictures

pdf-lib stores a PNG's pixels in the PDF in the PNG's own row format: every row starts with a *filter byte* saying how the row is encoded relative to the row above and the pixel to its left (None, Sub, Up, Average or Paeth). `unfilterPng` undoes that to get plain pixels. Then the picture is scanned: if every pixel has red = green = blue it is rewritten as one grey channel; otherwise every pixel goes through the formula into four channels. A picture's transparency (soft mask) is kept as it was.

### Stages, and what is not done

This is the first stage: black as K only, grey pictures, colour pictures by the plain formula, drawing colours. Not done: colour profiles (ICC), rich black or ink limits, JPEG pictures, gradients and patterns, and colours set by other operators than `rg`/`RG`.

## Code

### `rgbToCmyk`

```js file=shared/js/pdfCmyk.js fn=rgbToCmyk
```

### `convertContentColours`

```js file=shared/js/pdfCmyk.js fn=convertContentColours
```

**The Logic:** the pattern finds three numbers followed by `rg` or `RG`. `grey = r === g && g === b` decides black-only. The replacement is the four numbers (rounded to three decimals) and `k` or `K`. `stats` counts what changed for the report.

### `unfilterPng`

```js file=shared/js/pdfCmyk.js fn=unfilterPng
```

**The Logic:** for each row the code reads the filter byte, then rebuilds every byte from the byte to its left (`a`), above (`b`) and above-left (`c`): Sub adds `a`, Up adds `b`, Average adds half of `a + b`, Paeth picks whichever of `a`, `b`, `c` is closest to `a + b - c`. `& 255` keeps each result in one byte.

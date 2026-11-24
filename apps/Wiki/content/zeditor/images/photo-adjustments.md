## Intro

**Photo adjustments** are the basic photo-editing sliders: light, colour and levels. They change the picture's pixels **before** any filter, so a Threshold or Halftone filter works on the already corrected photo. The sliders are non-destructive: the original is kept, and the same code draws the live preview and the exported PDF.

## How to use

Select an image and open **Photo Adjustments** in the Format panel. Each slider runs −100 to +100 and rests at 0:
- **Light:** Exposure, Brightness, Contrast, Highlights, Shadows.
- **Color:** Saturation, White balance (cool ↔ warm), Tint (green ↔ magenta).
- **Levels:** Black point (0–254), White point (1–255, default 255), Midtones % (10–300, default 100).
- Each group has a reset; a slider away from its rest value counts as "adjusted".

## How it works

### One lookup table for the per-channel steps

Exposure, brightness, contrast and levels change each colour channel with a **function of that channel's value alone**: a pixel value 0–255 goes in, a new value comes out. Instead of calculating the maths for every pixel (millions of them), the code works it out **once for each of the 256 possible values**, storing the answers in a `Uint8ClampedArray(256)`: a **lookup table (LUT)**. Each pixel is then just `lut[value]`, one array read.

### The steps in the table

1. **Levels.** The value is rescaled so the *black point* becomes 0 and the *white point* 255, anything outside is clamped: `(i − black) / (white − black)`. Then **gamma**: raised to the power `1 / (midtones / 100)`. A gamma below 1 darkens the midtones, above 1 lightens them, while black and white stay put.
2. **Exposure.** Multiplies by `2^(exposure / 50)`: +50 is **one stop** (twice as bright), +100 two stops. A stop is a doubling of light, as on a camera.
3. **Brightness.** Adds `brightness × 1.2`.
4. **Contrast.** Pushes values away from the middle grey 128 by a factor taken from the classic contrast formula `(259 × (c + 255)) / (255 × (259 − c))`.

### Steps that need the whole pixel

- **Shadows / Highlights:** a lift weighted by how dark or bright the pixel is: `shadows × (1 − l)² + highlights × l²`, where `l` is the pixel's luma 0–1 (the squares make the effect strong at the extremes and fade smoothly towards the middle).
- **White balance and tint** multiply the red and blue channels (warm: more red, less blue) and the green channel (tint).
- **Saturation** moves each channel away from (or towards) the pixel's luma: `luma + (channel − luma) × saturation`. At `saturation = 0` every channel equals the luma: grey.

### Writing the result

The pixel array is a `Uint8ClampedArray`, so assigning a number outside 0–255 is **clamped** (squeezed to 0 or 255) and rounded automatically.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The slider definitions

```js file=apps/ZEditor/src/model/photoAdjust.js fn=adjustSlider,isAdjusted,hasPhotoAdjust
```

**The Logic:** `adjustSlider(prop, label, fallback, min, max)` builds one slider description, with defaults −100…100 and 0 at rest. `isAdjusted` is true when the item has a value for that slider that differs from the resting value; `hasPhotoAdjust` is true when **some** slider is adjusted (`.some` asks "is this true for at least one?"). Drawing skips the whole adjustment step for an untouched photo, which keeps unedited pictures fast.

### `applyPhotoAdjust`

```js file=apps/ZEditor/src/render/photoAdjust.js fn=applyPhotoAdjust
```

**The Logic:**
- `controlValues` reads every slider, using its resting value if missing. `white = Math.max(black + 1, v.adjWhite)` protects against dividing by zero if the white point is dragged below the black point.
- The values are turned into working numbers: `invGamma`, `gain = Math.pow(2, exposure / 50)`, `offset`, and `contrast`.
- The **loop over 256 values** builds `lut`: `level` is the levels step (rescale, clamp with `Math.min(1, Math.max(0, …))`, raise to `invGamma`, scale back to 0–255); then `((level × gain + offset) − 128) × contrast + 128` applies exposure and brightness and then contrast around the middle value 128.
- `toneMapped`, `balanced` and `saturation !== 1` are flags so the per-pixel steps run only if needed.
- The pixel loop `for (let i = 0; i < data.length; i += 4)` visits each pixel (four numbers: R, G, B, A). Fully transparent pixels (`data[i + 3] === 0`) are skipped. `lut[data[i]]` is the table lookup; the three optional steps follow; the results are written back, clamped automatically.

**Worked example (real numbers).** The lookup table for some single-slider settings, at selected input values:

| Setting | Input value | Output |
|---|---|---|
| Exposure +50 (one stop) | 100 | `100 × 2 =` **200** |
| Contrast +50 | 100 | `c = 60`, factor `259 × 315 / (255 × 199) = 1.608`: `(100 − 128) × 1.608 + 128 =` **83** |
| Contrast +50 | 200 | `(200 − 128) × 1.608 + 128 =` **243.8** |
| Brightness +20 | 100 | `100 + 20 × 1.2 =` **124** |
| Black 50, White 200 | 125 | `(125 − 50) / 150 = 0.5`, so `0.5 × 255 =` **127.5** |
| Midtones 200% (gamma) | 128 | `(128 / 255)^0.5 = 0.708`, so **180.7**: lighter |

Contrast makes dark values darker and bright values brighter, while 128 stays 128. For the per-pixel steps take the orange pixel (200, 100, 50) with luma `0.299 × 200 + 0.587 × 100 + 0.114 × 50 = 124.2`. **Saturation +50** (`× 1.5`): red `124.2 + (200 − 124.2) × 1.5 =` **237.9**, green `124.2 + (100 − 124.2) × 1.5 =` **87.9**, blue `124.2 + (50 − 124.2) × 1.5 =` **12.9**: more vivid. **Temperature +50** (`warm = 0.5`): red × (1 + 0.5 × 0.3) = ×1.15 and blue × 0.85. **Shadows +50** (`shadows = 45`) on a dark pixel with `l = 0.2`: lift `45 × (1 − 0.2)² = 28.8` added to every channel.

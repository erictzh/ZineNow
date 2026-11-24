## Intro

A shape's **fill** is a solid colour or a **gradient**: a smooth change from one colour to another, in a line (linear) or from the middle outwards (radial). Each colour has its own opacity, so a gradient can fade out to nothing. A **stroke** (outline) is an effect from the Effects section.

## How to use

In the shape's **Fill** section:
- **Fill:** *Solid*, *Linear gradient* or *Radial gradient*.
- **Fill color** and **Fill opacity (%)**.
- For a gradient: **Gradient color** and **Gradient opacity (%)**, **Angle (°)** (linear only), and **Start (%)** and **End (%)**, where along the shape the change begins and ends.
- The same two-colour gradient is available for **text** (Effects → Gradient).
- The whole shape's **Opacity** and **Blend** are in the Layers panel.
- **Stroke:** *Effects → Stroke* (colour, thickness 1–40 px).

## How it works

### Colour stops

A gradient is described by **colour stops**: "at 0% the colour is red, at 100% it is blue". Everything in between is blended. ZEditor draws the same gradient two ways: as **CSS** on screen and on a **canvas** for export. The two do not blend colours exactly alike, so the code does the blending itself and hands both a list of explicit stops.

### Why premultiplied alpha?

Fading *and* changing colour at once is subtle. Take red fading to *fully transparent blue*. A naive blend goes through a purple-ish, murky half-transparent mix. CSS instead uses **premultiplied alpha**: it blends each colour multiplied by its own opacity, so a colour with no opacity contributes nothing, and the fade stays a clean red. Canvas gradients do not do this, so a two-stop gradient would look different on screen and in the PDF. The fix: when the two ends differ in opacity, work out the in-between colours using the premultiplied rule and write **16 stops** explicitly. Both CSS and canvas then paint the same ramp.

### The linear gradient's line

CSS's `linear-gradient(90deg, …)` has a specific geometry: the gradient line passes through the **centre** of the box at the given angle, and is exactly long enough that the **corners land on its two ends**. The code reproduces that for canvas, so screen and export agree. Angles are **compass-style**: 0° points up, 90° right.

### The radial gradient

CSS's default radial gradient is an **ellipse** that has the box's proportions and just reaches the **farthest corner**. On a canvas it is drawn as a unit circle that is **stretched** (scaled) into an ellipse.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `rectGradientStops`

```js file=apps/ZEditor/src/render/gradients.js fn=rectGradientStops
```

**The Logic:**
- `controlValues` reads the settings; `hexToRgb` turns `#rrggbb` into red, green and blue numbers. `a1`, `a2` are the two opacities as 0–1. `end = Math.max(start, end)` stops the end being before the start.
- With equal opacities one step is enough (`steps = 1`: two stops); otherwise 16.
- The loop makes a stop for each `t` from 0 to 1. `a = a1 + (a2 − a1) × t` is the blended opacity (**linear interpolation**, "lerp"). `channel(p, q)` blends one colour channel the premultiplied way: `premultiplied = p·a1 + (q·a2 − p·a1)·t` (each colour times its own opacity, then blended), and divides by `a` to get the colour back (`premultiplied / a`), unless `a` is 0, where it falls back to a plain blend.
- Each stop is `{ percent, color: "rgba(r,g,b,a)" }`, with `percent` placed between the Start and End settings.

**Worked example (real output).** Red (`#ff0000`, opacity 100) to blue (opacity **0**): stops at 0%, 50%, 100% are **`rgba(255,0,0,1)`**, **`rgba(255,0,0,0.5)`**, **`rgba(0,0,255,0)`**. At the halfway point the colour is still pure red, at half opacity: premultiplied, `red: 255 + (0 − 255) × 0.5 = 127.5`, divided by `a = 0.5` gives 255 again; blue `0`. A naive blend would have given a half-red half-blue `(127, 0, 127)`. Black to white, both opaque: just two stops, **`rgba(0,0,0,1)`** at 0% and **`rgba(255,255,255,1)`** at 100%.

### `rectFillCss`

```js file=apps/ZEditor/src/render/gradients.js fn=rectFillCss
```

**The Logic:** for a solid fill it returns an `rgba(...)` colour text with the opacity as 0–1. Otherwise the stops are joined into the text CSS wants (`"rgba(…) 0%, rgba(…) 100%"`, `.map` then `.join(", ")`) and wrapped as `linear-gradient(<angle>deg, …)` or `radial-gradient(ellipse farthest-corner at 50% 50%, …)`. This string is used as the CSS `background` of the shape in the live editor.

### `makeLinearGradient`

```js file=apps/ZEditor/src/render/gradients.js fn=makeLinearGradient
```

**The Logic:** `(dx, dy) = (sin θ, −cos θ)` is the unit vector of the gradient direction in **compass** terms (0° = up). `half` is half the gradient line's length: `(|w·dx| + |h·dy|) / 2`, the length at which the line, through the centre, touches the corners. The gradient runs from `centre − direction × half` to `centre + direction × half` (`createLinearGradient(x0, y0, x1, y1)`), and each stop is added at `percent / 100`.

**Worked example.** A 200 × 100 box at 45°: `dx = 0.7071`, `dy = −0.7071`; `half = (200 × 0.7071 + 100 × 0.7071) / 2 =` **106.1**. The line runs from `centre − (0.7071, −0.7071) × 106.1 = (centre.x − 75, centre.y + 75)` to `(centre.x + 75, centre.y − 75)`, so it climbs to the upper right. The corners are exactly on its two ends in the sense that matters: the bottom-left corner (−100, +50 from the centre) projects onto the line's direction at `−100 × 0.7071 − 50 × 0.7071 = −106.1`, the top-right corner at +106.1. So the first colour starts at the bottom-left corner and the last colour finishes at the top-right corner, with no empty band. At 90°, `dx = 1`, `dy = 0`: `half = 100`, so the line runs from the left edge to the right edge, horizontally.

### `paintRectFill`

```js file=apps/ZEditor/src/render/gradients.js fn=paintRectFill
```

**The Logic:** for *solid*, it fills the whole box. For *linear*, the canvas gradient from `makeLinearGradient` is the fill style. For *radial*: `reach = √2`. The canvas is **translated** to the box's centre and **scaled** by `w / 2 × reach` and `h / 2 × reach`, then a radial gradient of **radius 1** is created: in the stretched space that unit circle becomes an ellipse reaching exactly the corners (a corner is at `(w/2, h/2)`, which in unit coordinates is `(1/√2, 1/√2)`, at distance 1 from the centre). `save()` and `restore()` bracket the transform so it does not stay. The rectangle `fillRect(-1/reach, …)` covers the box in those units.

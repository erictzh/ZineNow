## Intro

**Effects** change how an image *looks around and inside* its box: a torn or rounded **edge shape**, a faded **Feather** edge, a film-style **Lomo** colour look, a **Stroke** border, a **Shadow** and dusty **Texture**. Every effect is a set of sliders, is non-destructive, and is drawn by the same code on screen and in the PDF.

## How to use

In the Format panel, **Effects** lists the effects with a switch each (switching one on shows its sliders):
- **Edge shapes (one at a time):** *Rounded* (radius %), *Ellipse*, *Torn Edge* (tooth size, depth, variation), *Scissor Cut* (cuts per side, depth, variation).
- **Feather:** the edge fades to see-through: *Width* (% of the short side), *Fade* (smooth or linear), *Sides* (all round, top and bottom, left and right, or one side). It follows the edge shape if one is on, and switches **Stroke** off (a border on a faded edge looks wrong).
- **Lomo:** Strength, Contrast, Saturation boost, Colour shift, Shadow and Highlight colours, Vignette (darkness, how far in, round or fits the picture), Grain. Four presets: Classic, Warm, Teal & orange, Faded.
- **Stroke** and **Shadow** can be **stacked**: tick the effect, then **+ Add stroke** / **+ Add shadow** for as many layers as you like (up to 8 each), like Photoshop's layer styles. Each stroke has its own **colour**, **thickness** (1–40 px) and **position**: **Inside**, **Center** or **Outside** the edge. Each shadow has its own colour, distance, direction (0° up, 90° right) and blur. The **first card is on top**; the ↑ ↓ buttons reorder and × deletes. Pictures and shapes can be stacked; text still has one stroke and one shadow. Old projects open exactly as before.
- **Bevel & Emboss** (pictures and shapes): a lit raised or pressed edge. *Style*: **Inner bevel** stays on the shape, **Emboss** is wider and spills over the edge. *Surface*: Raised or Pressed in. *Depth* (%), *Size* (px, how wide the sloped edge is), *Light from* (°, 0 top, 90 right, 180 bottom, 270 left, default 315 = top left), and the colour and strength of the **Highlight** and the **Shadow**. It follows the edge shape (rounded, ellipse, torn…).
- **Texture:** grit, dust, scratches in a colour.
- Rectangles and ellipses get the same edge, stroke, shadow and texture effects.

## How it works

### The edge shape is an SVG path

Rounded, Ellipse, Torn Edge and Scissor Cut each produce an **outline**: a string in the SVG path language (`M0 0H100V50…`: move, horizontal line, vertical line…) in the image's own coordinate space. The same path is used to **clip** the picture (show only inside), to draw the **stroke**, to cast the **shadow** and to confine the **texture**. Because one outline feeds everything, effects stack without special cases.

### Torn and scissor edges use repeatable noise

The "random" jaggedness comes from a deterministic hash (`seededNoise`, see [Xerox](zeditor/pages/page-filter/xerox)). The same settings give the same edge, and the **Variation** slider just shifts where the hash starts reading, giving a different edge. All sizes are **percentages of the short side**, so an effect keeps its look when the image is resized or exported.

### Composing on a separate canvas

The box is not drawn directly on the page. It is first assembled on its own canvas, with extra room (`pad`) for a stroke that spills outside: clip to the outline, paint the picture, scatter the texture, stroke the outline. Then that finished canvas is drawn onto the page, with the canvas **shadow** switched on. Clipping on the page's own canvas would clip the shadow away too, and this way the shadow also falls from the stroke.

### Lomo

Lomo (after the Lomo LC-A, a cheap Russian film camera) is the "toy camera" look. It is built from five steps applied to every pixel: an **S-curve** for contrast, a saturation boost, a **cross-process tint** (shadows lean one colour, highlights another, named after developing film in the wrong chemistry), a **vignette** (darker towards the corners) and **film grain**. A final *Strength* blends the result with the original.

### Feather: a distance transform

To fade an edge over *N* pixels, the code must know **how far each pixel is from the edge**. For a plain rectangle that is easy (the distance to the nearest side). For a torn or rounded shape it is not, so it computes a **distance transform**: a number per pixel, its distance to the nearest outside pixel. The cheap and classic way is a **chamfer** transform: two sweeps over the picture (top-left to bottom-right, then back) where each pixel takes the smallest of its already-known neighbours' distances plus 1 (straight neighbour) or 1.4142 (diagonal neighbour). That approximates true distance. The fade then maps distance to opacity with a curve: **linear** (`t`) or **smoothstep** (`t² × (3 − 2t)`, which eases in and out).

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Stacked strokes and shadows

A picture or shape stores its strokes in a list, `strokes: [{ color, thickness, position }]`, and its shadows in `shadows: [{ color, thickness, direction, blur }]` (model/effectStacks.js). The old single `stroke` and `shadow` settings are still read (`strokeLayers`, `shadowLayers`), so older files look the same; the `stroke` and `shadow` flags stay the on/off switches.

**Inside, centre, outside.** A line is always drawn centred on the edge, half in and half out. An **inside** stroke is drawn **twice as wide** and then cut to the shape, which leaves exactly its width inside. An **outside** stroke is drawn twice as wide and cut *away* from the shape (a clip with the "even-odd" rule: a big rectangle with the shape cut out of it), leaving its width outside. The live editor does this with an SVG `clipPath` and `mask`, the export with a canvas clip, and the SVG export with the same two.

**Several shadows.** One shadow uses the browser's `drop-shadow` as before. Chained `drop-shadow`s would cast shadows of shadows, so several use one SVG filter: for each shadow the shape's see-through outline is blurred, moved and coloured, then all are laid on top of each other with the picture over them. In the export canvas each shadow is cast alone by drawing the picture far off the page with the shadow offset cancelling the distance, so only the shadow lands on the page.

### Bevel & Emboss: lighting from the outline

The bevel never looks at the picture's pixels, only at its **outline**. `bevelCanvas` fills the outline into a black-and-white **mask**, then `bevelPixels` blurs the mask into a smooth *height*: zero outside the shape, rising across the edge, one well inside (the blur width is the *Size*). The **slope** of that height at each pixel (how fast it changes in x and y) says which way the edge faces. If it faces the light (`light direction` is where the light comes *from*), the pixel gets the **highlight** colour; if it faces away, the **shadow** colour; the steeper the slope and the higher the *Depth*, the stronger. *Pressed in* just flips the sign. *Inner bevel* only keeps pixels inside the mask; *Emboss* keeps the whole result, so the edge spills outside, which is why the overlay canvas has a margin. The live editor and the export call the same code, so what you see is what exports. A shape or picture with a bevel goes into an SVG file as a picture of itself.

### `imageShadowOffset`

```js file=apps/ZEditor/src/model/imageEffects.js fn=imageShadowOffset
```

**The Logic:** it returns `null` if the shadow is off or has neither thickness nor blur. The direction is a compass angle in **degrees** (0° = up, 90° = right), converted to radians. A shadow falls in direction θ at distance `thickness`: `x = sin θ × thickness`, `y = −cos θ × thickness`. The minus on `y` is there because on a screen y grows **downward** while "up" must be 0°.

**Worked example (real numbers).** Thickness 6: direction 0° gives `(0, −6)` (6 px up), 90° gives `(6, 0)` (right), 180° gives `(0, +6)` (down), and the default **135°** gives `(4.24, 4.24)`: down and to the right, `6 × sin 135° = 4.24`.

### Edge outlines: `roundedOutline`, `tornEdgeOutline`

```js file=apps/ZEditor/src/model/edgeShapes.js fn=roundedOutline,tornEdgeOutline
```

**The Logic:**
- `roundedOutline`: the radius is a percentage of the short side. The path is built as a template string: `M r 0` start after the top-left corner, `H` horizontal line to `w − r`, then the helper `corner(x, y)` which writes an SVG **arc** command `A r r 0 0 1 x y` (a quarter circle of radius `r`, ending at `x, y`), `V` a vertical line, and so on around the box; `Z` closes it.
- `tornEdgeOutline`: `step` is the distance between "teeth" (tooth size % of the short side), `jitter` the depth. If the settings were touched (`tuned`), the step is **adjusted so a whole number of teeth fits each side** (`width / Math.max(1, Math.round(width / step))`), so corners are not sliced off. Four loops walk the top, right, bottom and left sides, adding a point at every step, each pushed **inward** by a noise amount (`noise(i++) × jitter`). The `eps = 1e-6` keeps the last point despite floating-point error. `pointsToOutline` joins the points with straight lines: a jagged torn edge.

**Worked example.** A 300 × 200 image. **Rounded** with radius 12%: `r = min(300, 200) × 12 / 100 =` **24** px. **Torn edge** with tooth size 10%: `step = 200 × 10 / 100 = 20`; `stepX = 300 / round(300 / 20) = 300 / 15 = 20`: 15 teeth along the top, so 16 points from x = 0 to x = 300, each between 0 and `jitter = 200 × 6 / 100 = 12` px inward.

### `drawBoxWithEffects` (one shadow shown; several are drawn one by one as described above)

```js file=apps/ZEditor/src/render/boxEffects.js fn=drawBoxWithEffects
```

**The Logic:**
- `ctx.save()` and `ctx.restore()` bracket the work so changes to the drawing state (rotation, shadow) do not leak.
- `rotateAboutCenter` turns the canvas about the box's centre, so the shadow, being measured on the page, keeps its direction while the item turns (the code comment explains it).
- If there is a shadow, the canvas's shadow properties are set (colour, offsets, blur), all multiplied by `scaleFactor` for the export resolution.
- If the box has an edge outline, a stroke or texture, it is composed on a new canvas `cut`: `pad` is the extra room for the stroke (`thickness × miterLimit / 2`, rounded up, plus 2). `cctx.clip(new Path2D(outline))` restricts all further drawing to inside the outline; `paintContent(cctx)` paints the picture; `drawTextureMarks` scatters the texture; `restore()` removes the clip; then the stroke is drawn along the outline (`stroke(new Path2D(outline || rectOutline(ann)))`, using a mitred join with a limit of 4, so the live view and the export agree). Finally `ctx.drawImage(cut, x - pad, y - pad)` puts the finished box on the page (the canvas shadow is applied now).
- With no such effects, the content is painted straight onto the page: `translate`, `scale`, `paintContent`.

### `drawTextureMarks`

```js file=apps/ZEditor/src/render/boxEffects.js fn=drawTextureMarks
```

**The Logic:** the marks are in four groups: **grit** (tiny squares), **dust** (round specks), **fibres** (short curved hairs) and **scratches** (long, nearly vertical lines). `paintMarks` draws one group: it takes a repeatable `noise` stream for that group, sets the opacity, builds **one path** with all the marks (`addMark` is called `count` times), and paints it once, which is much faster than painting thousands of marks separately. Sizes are fractions of the short side, so the texture scales with the image. Fibres and scratches are **quadratic curves** (`quadraticCurveTo` with one control point) along a random heading with a small bend.

**Worked example.** Settings grit 40, dust 20, scratches 15: grit squares `40 × 60 =` **2400**, dust specks `20 × 1.5 =` **30**, fibres `20 × 0.8 =` **16**, scratches `Math.round(15 × 0.3) =` **5** (4.5 rounds up). Moving the Variation slider changes where the noise starts, so the marks land in new places; the *counts* never change with the image size, but their sizes do.

### Lomo: `lomoPixels`

```js file=apps/ZEditor/src/render/lomo.js fn=lomoPixels,smoothstep,hash
```

**The Logic:**
- `smoothstep(a, b, x)` is a smooth ramp from 0 (at `a`) to 1 (at `b`): `t = clamp((x − a) / (b − a))`, then `t² (3 − 2t)`. `hash(x, y, seed)` is a repeatable random number for a pixel from three multiplications by large primes and bit mixing (`Math.imul` is a 32-bit multiply), so the same picture always gets the same **grain**.
- Inside `lomoPixels`, the settings (0–100) become 0–1 fractions. `chroma(rgb)` is a tint colour with its **brightness removed** (`rgb − luma`), so tinting changes the colour without changing the brightness.
- For each non-transparent pixel: **contrast** uses the **S-curve** `s(v) = v²(3 − 2v)`, which darkens values below 0.5 and brightens those above; the pixel moves towards it by `(s(v) − v) × contrast × 1.4`. **Saturation** pushes channels away from the luma. **Cross-process tint:** `ws = (1 − l)² × tint` weights the shadow colour (strong in the darks), `wh = l² × tint` the highlight colour (strong in the brights).
- **Vignette:** `dx, dy` are the pixel's position from the centre as a fraction of the half-width/height (−1 to 1). `oval` is the distance from the centre, scaled so a corner is 1; `circle` is the true circular distance; `round` blends the two. `k = 1 − vignette × smoothstep(vStart, 1, d)` darkens from the distance `vStart` outwards.
- **Grain:** the sum of two hashes minus 1 is noise from −1 to 1, strongest in the mid-tones (`mid = 1 − |l − 0.5| × 1.2`).
- The last three lines blend with the original by *Strength*: `original + (result − original) × strength`.

**Worked example (real numbers).** *Contrast at 40:* a shadow value 0.25 becomes `0.25 + (0.156 − 0.25) × 0.4 × 1.4 = 0.197` (darker), and 0.75 becomes **0.803** (lighter); 0.5 stays 0.5. *Vignette* on a 100 × 100 picture, darkness 55, "how far in" 50 so `vStart = 1 − 0.5 × 0.9 = 0.55`: at the very corner `d ≈ 0.99`, `smoothstep(0.55, 1, 0.99) = 0.9985`, so `k = 1 − 0.55 × 0.9985 =` **0.451** (the corner is at 45% brightness). At `d = 0.775` (halfway) `smoothstep = 0.5`, `k = 0.725`. At `d ≤ 0.55` `k = 1`: the middle is untouched. A plain mid-grey (128) picture with the Classic preset's numbers but the grain set to 0 gives (129, 129, 123) in the centre (a slight warm tint) and **(58, 58, 55)** in the corner (real output).

### Feather: `distanceToOutside`

```js file=apps/ZEditor/src/render/feather.js fn=distanceToOutside
```

**The Logic:**
- `inside` is a list with one 0/1 per pixel (1 = part of the shape). The distances are kept in a `Float32Array` with a **1-pixel border** (`W = w + 2`, `H = h + 2`), so the picture's own edge counts as outside and neighbour lookups never leave the array.
- Initially every shape pixel is `INF` (huge), every other pixel 0.
- **Forward pass** (top-left to bottom-right): each shape pixel takes the smallest of its left neighbour +1, upper neighbour +1, and the two upper diagonals +1.4142. Because the neighbours above and to the left are already final, one sweep carries the information from the top-left. **Backward pass** (bottom-right to top-left) does the same with right, lower and lower diagonal neighbours.
- 1.4142 is √2, the length of a diagonal step, so the distances approximate real straight-line distances (a "3-4 chamfer" uses 3 and 4 instead; this one uses 1 and √2).

**Worked example (real output).** A fully solid 5 × 5 shape:

| | | | | |
|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 1 |
| 1 | 2 | 2 | 2 | 1 |
| 1 | 2 | **3** | 2 | 1 |
| 1 | 2 | 2 | 2 | 1 |
| 1 | 1 | 1 | 1 | 1 |

The outer ring is 1 away from the outside (the border), the next ring 2, the middle 3.

### Feather: `featherAlpha`

```js file=apps/ZEditor/src/render/feather.js fn=featherAlpha,curve
```

**The Logic:** `curve(t, kind)` clamps `t` to 0–1 and returns it for "linear" or `c × c × (3 − 2c)` for "smooth". `featherAlpha` returns one opacity multiplier (0–1) per pixel. With an edge **shape**, it is `curve((dist − 0.5) / f)` inside and 0 outside: the opacity rises from the edge over `f` pixels. For a plain rectangle, each enabled side contributes `curve(distance to that side / f)`, and the contributions are **multiplied** (`a *= …`), so corners, where two sides fade, are fainter. `sides` is turned into four true/false flags first.

**Worked example.** A 600 × 400 image, width 12%: `f = 0.12 × min(600, 400) =` **48** px. A pixel in the top row (distance 0.5): `t = 0.5 / 48 = 0.0104`, smooth gives `0.0104² × (3 − 0.021) =` **0.0003**: practically transparent. A pixel 12 px from the top: `t = 12 / 48 = 0.25`: smooth gives **0.156**, linear 0.25. At 24 px: **0.5** both ways. At 48 px or more: **1** (solid). A corner pixel 12 px from both the top and the left: `0.156 × 0.156 =` **0.024** (very faint).

## Intro

A **vector layer** is what Vectorize creates: an item that holds the traced shapes *and the picture they came from*, so you can change the settings later and the shapes are re-traced. You can also **recolour** each colour, hide a colour, show only the outlines, **Expand** it into permanent shapes, or **Rasterize** it back into a picture.

## How to use

After choosing a preset, the Vectorize panel shows:
- **Preset** (and "Custom" once you change a value), **View:** *Tracing result*, *Outlines*, *Outlines with source image* or *Source image* (the view is for the screen only; export always draws the result).
- **Mode, Threshold or Colours**, and *Advanced*: **Paths, Corners, Noise, White areas**, and the **Method** (*Overlapping* or *Abutting*).
- **Fills** and **Strokes** switches and **Stroke width** (1–20): fill the shapes, outline them, or both.
- **Colours:** every colour found, each with a swatch to **recolour** it, or to hide it ("none"), and a reset.
- **Save as SVG** downloads the shapes as an SVG file.
- **Expand** makes the shapes permanent (the source picture is dropped, so the file gets smaller; it no longer re-traces). **Rasterize** turns the layer into an ordinary picture.
- The original image is **hidden, not deleted**: show it again in the Layers panel.

## How it works

### The source picture

The tracer starts from the image **as it looks** (crop, photo adjustments and filter applied; not rotation, opacity or effects), shrunk to at most **900 pixels** on its long side and never beyond its own pixels. That picture is kept inside the vector layer (`traceSource`) as a PNG. Keeping it is what lets you change settings later; 900 pixels is a balance between detail and speed.

### Sliders to numbers

The tracer needs three numbers; the sliders map onto them, and the mapping **scales with the picture size** so a slider changes the look about the same at any size:
- **tolerance** (how far a simplified outline may stray): Paths 100 gives 0.35 px, Paths 0 gives a fiftieth of the long side. In between the values follow an **exponential** (geometric) scale, so each step multiplies the tolerance by the same factor, which feels even to the eye.
- **corner angle:** Corners 0 gives 150° (almost everything is rounded), Corners 100 gives 30° (almost everything sharp), a straight line in between.
- **minimum area:** Noise 100 drops specks up to a twentieth of the long side across. The area is the **square** of that size.

### Re-tracing while a slider moves

Tracing takes a moment. When a setting that changes the shapes is changed, the new settings are saved at once but the trace is **debounced**: it waits 120 ms after the last change, and a numbered **token** makes sure that only the latest request's result is used if several overlap. Settings that only change how the result is *drawn* (fills, strokes, stroke width, view) never need a new trace.

### Recolouring by colour name

Recolours are stored by the **traced colour** (`"#1a1a1a" → "#dd531a"`), so they survive a re-trace that finds the same colour again.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `tracerParams`

```js file=apps/ZEditor/src/model/trace/traceSettings.js fn=tracerParams
```

**The Logic:** `size` is the picture's long side. `tight = 0.35` and `loose = max(1.5, size / 50)` are the two ends of the tolerance scale. `loose × Math.pow(tight / loose, detail / 100)` is a **geometric interpolation**: at `detail = 0` it is `loose`, at 100 it is `tight`, and each step in between multiplies by the same ratio. `cornerAngle = 150 − (corners / 100) × 120` is a straight line from 150° down to 30°. `speck` is the largest speck width allowed (noise as a fraction of `size / 20`, but at least a picture of 200 px); `minArea = speck²`.

**Worked example (real output)**, a 900 px picture:

| Paths (detail) | tolerance |
|---|---|
| 0 | `18` (900 / 50) |
| 50 | `18 × (0.35 / 18)^0.5 =` **2.51** |
| 100 | **0.35** |

| Corners | corner angle |
|---|---|
| 0 | 150° |
| 50 | **90°** |
| 100 | 30° |

Noise 8: `speck = 0.08 × (900 / 20) = 3.6`, so `minArea =` **12.96** px² (loops smaller than about 3.6 × 3.6 are dropped). Noise 100: `speck = 45`, `minArea =` **2025**. Noise 0: 0.

### `normalizeTraceSettings` and `presetSettings`

```js file=apps/ZEditor/src/model/trace/traceSettings.js fn=presetSettings,normalizeTraceSettings
```

**The Logic:** `presetSettings(key)` finds the preset (falling back to the first), then builds the full settings: a set of defaults, then `COMMON` (method, fills, strokes, view), then the preset's own values, later ones overriding earlier (`{ ...a, ...b }`). `normalizeTraceSettings` merges the given settings over the preset base, then **validates** each: `clamp(x, lo, hi, fallback)` rounds to a whole number and squeezes it into the range, or uses the fallback if it is not a number (`Number.isFinite`); choice fields accept only known values (`["bw", "gray", "color"].includes(v.mode) ? v.mode : "bw"`). A damaged project file therefore can never break the tracer.

### `traceDrawList`

```js file=apps/ZEditor/src/model/trace/traceLayer.js fn=traceColorOf,traceDrawList
```

**The Logic:** `traceColorOf` returns the recoloured colour if there is one, else the traced one. `traceDrawList` builds what to draw, in order: each path with its (possibly changed) colour; a colour set to `"none"` is skipped (hidden); the fill is the colour if Fills is on, the stroke if Strokes is on; a path with neither is left out. **Worked example.** Paths `[{ color: "#000000", d }, { color: "#ffffff", d }]`, `recolor = { "#000000": "#dd531a", "#ffffff": "none" }`, fills on, strokes off: the list is **one item**: the first path, filled `#dd531a`; the white one is hidden.

### `expandedTracePatch`

```js file=apps/ZEditor/src/model/trace/traceLayer.js fn=expandedTracePatch
```

**The Logic:** the paths are rewritten with their recoloured colours baked in, hidden ones removed (`.filter`). The patch then sets `recolor` and `traceSource` to `undefined` (deleting them: no more source picture, so the layer no longer re-traces and the project file is smaller) and forces the view to "result".

### `change`: re-tracing, debounced

```js file=apps/ZEditor/src/state/useImageTrace.js fn=change
```

**The Logic:**
- `patchedTraceSettings` merges the change into the settings (picking a preset loads all of its values). `handleUpdateAnnotation` saves them **at once**, so the panel responds immediately.
- `needsTrace` is true if the layer has a source and some changed key is *not* a draw-only property.
- `token = ++tokenRef.current` takes a new number (`++x` adds one first and returns the new value). `clearTimeout` cancels the previous waiting timer, and `setTimeout(…, 120)` starts a new one: if the slider keeps moving, the timer keeps being replaced, so the trace only runs once the slider has been still for 120 ms. This is **debouncing**.
- When it fires, `await runTrace(...)` runs the tracer. `if (token === tokenRef.current)` checks that no newer request has been made while it ran; only the newest result is stored (a **stale** one is dropped). The busy flag is cleared only by the newest request too.

**Worked example.** You drag Paths from 50 to 60 in about 10 steps over a second, one step every 100 ms. Each step saves the setting and replaces the timer (it never reaches 120 ms of calm); you stop at 60; 120 ms later **one** trace runs, with detail 60, and the layer updates. Without debouncing there would have been ten slow traces and the shapes would lag behind the slider.

### `traceSourceFromImage`

```js file=apps/ZEditor/src/render/traceSource.js fn=traceSourceFromImage
```

**The Logic:** `natural` is the picture's own long side (the crop's size if cropped). `long = Math.min(TRACE_MAX_SIDE, natural)` caps it at 900 and never enlarges. `scale = long / Math.max(ann.width, ann.height)` converts the on-page box to that resolution. `plain` is a copy of the image with position, rotation, opacity, blend and every effect **cleared**, so only crop, adjustments and filter remain. `drawImageOnCanvas` draws it, and the canvas is returned as a PNG text. **Worked example.** A 4000 × 3000 photo shown at 260 × 195 on the page: `natural = 4000`, `long = 900`, `scale = 900 / 260 = 3.46`, so the canvas is **900 × 675**.

### `drawTraceOnCanvas`

```js file=apps/ZEditor/src/render/drawTrace.js fn=drawTraceOnCanvas
```

**The Logic:** the paths are in the picture's own pixel coordinates (`traceW` × `traceH`), but the layer's box may be any size. `target.scale(ann.width / ann.traceW, ann.height / ann.traceH)` makes the canvas's coordinates match, so the paths scale with the box **without any loss**: the key advantage of vectors. Each `Path2D(item.d)` builds the shape from the path text; it is filled and/or stroked, with round joins and caps. Because it goes through `drawBoxWithEffects`, a vector layer gets edge, stroke, shadow and rotation like any box.

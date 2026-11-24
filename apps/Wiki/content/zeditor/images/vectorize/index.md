## Intro

**Vectorize** turns a picture (made of pixels) into **vector shapes** (made of curves and filled areas): like Illustrator's *Image Trace*. A traced picture can be scaled to any size without going blurry, recoloured colour by colour, and exported as SVG. It is best on logos, drawings and high-contrast photos.

## How to use

Select an image, and in the Format panel's **Vectorize** section choose a **preset**: Black & White, Line Art, Silhouette, Outline, Shades of Grey, 3, 6 or 16 Colours. A new **vector layer** appears over the picture (the picture is hidden, not deleted). Then fine-tune it: see [Trace layer and settings](zeditor/images/vectorize/trace-layer).

## How it works: the pipeline

The tracer is a chain of three simple stages. Each is in its own page:

1. **[Colour quantizing](zeditor/images/vectorize/quantizing):** reduce the picture to a few flat colours. Every pixel gets a label (which colour is it?).
2. **[Contour tracing](zeditor/images/vectorize/contours):** for each colour, walk along the pixel edges of its areas to get closed loops (stair-stepped outlines).
3. **[Curve fitting](zeditor/images/vectorize/curves):** simplify each loop to fewer points and smooth it into curves, written as an SVG path.

The function that ties them together:

```js file=apps/ZEditor/src/model/trace/traceImage.js fn=traceImage
```

**The Logic:**
- `normalizeTraceSettings` fills in and **clamps** the settings; `tracerParams` turns the sliders into the numbers the tracer uses (see the settings page).
- `quantizePixels` returns a `labels` list (one number per pixel) and a `palette` (the colours, most used first).
- For each colour in order, a `mask` (1 = this colour, 0 = not) is made. With the **overlap** method, the mask for colour `rank` is "labels at least `rank`", so each shape also covers the area of every colour drawn **above** it. No hairline gaps then show where smoothed edges meet. The **abut** method uses exactly each colour's own area.
- `traceMaskLoops` finds the outlines. A loop smaller than `minArea` is dropped (**noise removal**: specks). Each remaining loop goes through `edgeMidpoints` (smoothing the stairs), `simplifyClosed` (fewer points) and `smoothPathD` (curves), and the pieces are joined into one path string `d`. One path per colour is returned, in drawing order (bottom first).
- It is **pure**: no canvas or screen, only numbers in and out, so it can run in tests (and could move to a background thread).

**Worked example (real output).** A 4 × 4 picture that is white with a 2 × 2 black square in the middle, preset Black & White (noise 0): the result is a single path, colour `#000000`: `M1.3 1.8L1.3 1.8Q1.5 1 2.3 1.3L2.3 1.3Q3 1.5 2.8 2.3L2.8 2.3Q2.5 3 1.8 2.8L1.8 2.8Q1 2.5 1.3 1.8Z`. The white background is dropped (see-through). The 90° corners of the square were rounded into curves, which is the default for corners at the middle setting (see [Curve fitting](zeditor/images/vectorize/curves)).

## Intro

**Page Guide** draws the lines a printer cares about on top of your page: the **trim** (where the paper will be cut), the **margin** (the safe area inside it) and the **bleed** (the extra area outside it that gets cut off). A separate **center guide** marks the middle of the page, for covers and two-page spreads. They are editor-only: they never print or export.

## How to use

- **Page menu → Page Guide:** the switch shows or hides the lines; **Customize…** sets:
  - **Format:** Match Page Size, Half Letter, Digest, A5, A6, Quarter Letter, US Letter or A4. The trim box is drawn this size, centred on the page.
  - **Margin (in):** how far inside the trim the safe area sits (default 0.25 in).
  - **Bleed (in):** how far outside the trim the bleed line sits (default 0.125 in).
- **Match Page Size** means the page is already trimmed to its final size, so no separate trim line is drawn (the page edge is the trim).
- The **center guide** has its own button in the toolbar (it says "Show a guide down the middle of the page" when you hover it). It draws a dashed line down the middle of the page, and is hidden on "No paper" pages.

> **Tip** For a zine printed on a bigger sheet and cut down, choose the cut-down size as the Format and make the page a bit larger than it: you see exactly where the cut falls and how much bleed you have.

## How it works

### Real geometry, in inches

The presets are stored in **inches**; the page is in **points** (72 to the inch). The overlay converts with `px = inches × 72 × MAIN_SCALE`, the same unit the items live in, so the lines sit on the physical page whatever its size or rotation. A4 as a preset is `210 / 25.4` by `297 / 25.4` inches.

### Three nested rectangles

The trim rectangle is the preset size (clamped to the page: it cannot be bigger than the page), centred: `trimX = (width − trimW) / 2`. The margin rectangle is the trim shrunk by the margin on each side, drawn only if the margin is above zero and there is room left. The bleed rectangle is the trim *grown* by the bleed on each side. Dashes distinguish them: bleed is a faint dotted orange, trim a white dashed line, margin an orange dashed line.

### What bleed is for

A cutter is never exact, and a hair of white paper at the edge looks like a mistake. **Bleed** means extending background colour or pictures past the trim, so a slightly off cut still lands on ink. **Margin** is the opposite: text near the trim risks being cut, so text stays inside the margin.

### Editor only

The guides are an SVG laid over the page. The exporter never draws it, which is why guides never show in a PDF or image.

## Code

The presets, in inches, with their sizes in millimetres:

```js file=apps/ZEditor/src/model/guides.js
  sized("a5", "A5", 148 / 25.4, 210 / 25.4),
  sized("a6", "A6", 105 / 25.4, 148 / 25.4),
```

```js file=apps/ZEditor/src/model/guides.js
export const DEFAULT_GUIDE_MARGIN_IN = 0.25;
export const DEFAULT_GUIDE_BLEED_IN = 0.125;
```

Inches to editor pixels, and centring the trim box:

```js file=apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx
  const toPx = (inches) => inches * POINTS_PER_INCH * MAIN_SCALE;
```

```js file=apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx
  const trimX = (width - trimW) / 2;
  const trimY = (height - trimH) / 2;
```

The bleed box, the trim grown outward:

```js file=apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx
          x={trimX - bleedPx} y={trimY - bleedPx} width={trimW + bleedPx * 2} height={trimH + bleedPx * 2}
```

The center guide:

```js file=apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
            x1={pageSize.width / 2} y1={0} x2={pageSize.width / 2} y2={pageSize.height}
```

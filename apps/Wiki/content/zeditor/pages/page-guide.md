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

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### The preset list

```js file=apps/ZEditor/src/model/guides.js fn=mmText,sized
```

**The Logic:** `sized` is a function that builds one preset object. `({ ... })` with round brackets around the braces is how an arrow function **returns an object** directly. `label` is a **template literal**: text in backticks where `${...}` inserts a value, so you get "A5 (148mm × 210mm)". `mmText` multiplies inches by 254, rounds, and divides by 10: that is inches × 25.4 mm, rounded to one decimal.

### The overlay

```js file=apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx fn=GuidesOverlay
```

**The Logic:**
- `GUIDE_FORMAT_PRESETS.find(...)` picks the chosen preset, with the first ("Match Page Size") as a fallback (`||`).
- `toPx` converts inches to editor pixels: inches × 72 points × `MAIN_SCALE`. This is the same unit the page and items use, so the rectangles land exactly where the real sizes are.
- `Math.min(width, toPx(preset.widthIn))` stops the trim box being bigger than the page. `(width - trimW) / 2` centres it: half the spare room on each side.
- `showTrim = preset.key !== "match"`: for "Match Page Size" the page edge already is the trim, so no extra line is drawn. `showMargin` is only true if the margin is above zero **and** leaves room (`marginW > 0 && marginH > 0`).
- The `return` is **SVG**, the web's vector-drawing format, as JSX: one `<rect>` per box. The bleed box is the trim grown by `bleedPx` on every side (`x = trimX - bleedPx`, width plus twice the bleed); the margin box is the trim shrunk. `strokeDasharray="5 3"` draws a dashed line (5 px on, 3 off); `fill="none"` leaves the inside see-through.
- `{showBleed && (<rect ... />)}` is how JSX shows something *only if* a condition holds.

### The centre guide

```js file=apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
        <svg className="ze-guides-overlay" width={pageSize.width} height={pageSize.height} aria-hidden="true">
          <line
            x1={pageSize.width / 2} y1={0} x2={pageSize.width / 2} y2={pageSize.height}
            stroke="#1d9bf0" strokeDasharray="6 4" strokeWidth="1.25"
          />
        </svg>
```

**The Logic:** a `<line>` from the top middle (`x1 = width / 2, y1 = 0`) to the bottom middle (`x2` the same, `y2 = height`): a vertical line down the middle, in blue, dashed. `aria-hidden` tells screen readers to ignore it, since it is only decoration.

## Intro

Two controls let you adjust the workspace: the **zoom** under the preview, and the **draggable line** between the preview and the settings panel.

## How to use

**Zoom (strip under the preview)**
- Slider and number box, from **15% to 200%**. At **100%** the sheet is shown at its **real paper size** on your screen.
- **Fit** (the default) makes the sheet fill the preview's width, but never bigger than real size. Fit follows the window as you resize it.
- **Drag** over the sheets with the mouse, or one finger, to scroll; **pinch** with two fingers to zoom, keeping the spot between your fingers under them.
- The strip also tells the paper size and how many sheets and pages there are: *297mm × 210mm · 2 sheet(s), 16 pages*.

**Panel width:** drag the thin line between preview and settings; **double-click** it (or press **Home**) to reset; **← →** nudge it by 16 px. It is never narrower than **280 px**, and the preview always keeps **320 px**. The width is remembered. (Same idea as in Markdown to PDF: [Resizable panels](md2pdf/workspace/resizable-panels).)

## How it works

### Two sizes

The sheets are drawn at an internal size (for instance 1188 px wide) then **shrunk with a CSS transform** (`scale(...)`) to match the zoom. A transform changes how large things look but not how much room the layout gives them, so the box around the sheets must be sized by hand to the scaled size: otherwise the pane could not centre or scroll them properly.

### What 100% means

100% is the paper's real size: its width in inches × 96 (CSS pixels per inch) or in millimetres ÷ 25.4 × 96. The scale to apply is therefore `zoom × paperWidthPx ÷ sheetWidth`.

### Fit

Fit asks "how wide is the pane?" (minus 48 px of side padding), then divides by the paper's real width, limited to between 15% and 100%.

### Pinch and the gate

A **pinch gate** (shared with the other apps) ignores small changes in the distance between two fingers, so a two-finger scroll does not accidentally zoom.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### Fit, zoom and scale

```js file=apps/ZineArranger/src/previewZoom.js fn=paperWidthPx,getPreviewTargetWidth,fitPercent,currentZoomPercent,applyPreviewScale,sizeZineBox
```

**The Logic:**
- `paperWidthPx`: `state.aspectWidth` (text from the box, read with `parseFloat`; `|| 0` if empty). Millimetres: `w / 25.4 × 96`; inches: `w × 96`.
- `getPreviewTargetWidth`: the pane's width minus 48, but at least 200 (550 before the pane exists).
- `fitPercent`: `target ÷ paper × 100`, limited with `Math.max(ZOOM_MIN, Math.min(100, …))` to between 15 and 100.
- `zoomPct` is `null` for Fit or a chosen number, and `currentZoomPercent` returns whichever applies.
- `applyPreviewScale` computes `scale`, writes it to the CSS variable `--sheet-scale`, sizes the box, and updates the controls.
- `sizeZineBox` sets the box around the sheets to the sheets' unscaled size times the scale, rounded up with `Math.ceil`.

**Worked example (A4 landscape, 297 mm).** `paperWidthPx = 297 / 25.4 × 96 =` **1122.5 px**. Pane 800 px wide: target 752, Fit = `752 / 1122.5 =` **67.0%**; with the internal sheet 1188 px wide the scale is `0.67 × 1122.5 / 1188 =` **0.633**. At 100%: `1122.5 / 1188 =` **0.945**. Pane 1400 px wide: target 1352 would be 120%, so Fit **stops at 100%**.

### Keeping the spot under you: `setPreviewZoom` and `keepSpot`

```js file=apps/ZineArranger/src/previewZoom.js fn=setPreviewZoom,keepSpot
```

**The Logic:** before the zoom changes, it records where the anchor point lies inside the sheets' box as **fractions** (`fx`, `fy`: 0 is the left or top edge, 1 the right or bottom). After the zoom is applied the box has a new size, and `keepSpot` scrolls the pane so that the same fraction is back under the anchor: `scrollLeft += box.left + fx × box.width − anchorX`.

**Worked example.** The anchor is at the pane's middle; the box spans x = 100 to 500 (width 400) and the anchor at x = 300, so `fx = 0.5`. After zooming in, the box spans x = −50 to 750 (width 800): `scrollLeft += −50 + 0.5 × 800 − 300 = +50`. The point that was in the middle is still there.

### Panel resize

```js file=apps/ZineArranger/src/panelResize.js fn=setUpPanelResize
```

**The Logic:** exactly the same logic as [Resizable panels](md2pdf/workspace/resizable-panels) in Markdown to PDF, written with plain event listeners (`addEventListener`) instead of React. `clamp` keeps the width between 280 px and `body width − 320`. `refitPreview` sends a fake window `resize` event so the preview refits itself after the panel changes size.

**Worked example.** Body 1000 px wide: `most = max(280, 1000 − 320) = 680`. Dragging to a 200 px panel gives 280; to 900 gives 680.

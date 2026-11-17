// Applies whichever filter is chosen to a canvas, keeping transparency.

import { controlValues } from "../../model/controls.js";
import { HALFTONE_FILTER_CONTROLS, MIN_HALFTONE_CELL_SIZE } from "../../model/pageFilters.js";
import { applyColorRemap } from "./colorRemap.js";
import { drawHalftoneScreen } from "./halftone.js";
import { applyXerox } from "./xerox.js";

// Applies the page-level filter to whatever's currently painted on
// `ctx` (the page background, drawn just before this is called) —
// grayscale/duotone remap pixels in place, halftone replaces them
// outright. `scaleFactor` converts cellSize from its editor-px unit
// to this canvas's actual resolution (1 live, EXPORT_SCALE/MAIN_SCALE
// on export), same convention drawStrokeOnCanvas uses for strokeWidth.
export function applyPageFilter(ctx, canvas, filter, scaleFactor) {
  if (!filter || filter.type === "none" || canvas.width === 0 || canvas.height === 0) return;
  if (filter.type === "grayscale" || filter.type === "duotone" || filter.type === "threshold") {
    applyColorRemap(ctx, canvas, filter);
  } else if (filter.type === "halftone") {
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { cellSize } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
    // The screen is painted as a white sheet with marks on it, so an image
    // with see-through parts keeps its own alpha afterwards: the paper and
    // dots only show where the image did.
    const sourceAlpha = new Uint8ClampedArray(width * height);
    let hasTransparency = false;
    for (let p = 0; p < sourceAlpha.length; p++) {
      sourceAlpha[p] = imageData.data[p * 4 + 3];
      if (sourceAlpha[p] < 255) hasTransparency = true;
    }
    drawHalftoneScreen(ctx, imageData, width, height, Math.max(MIN_HALFTONE_CELL_SIZE, cellSize * scaleFactor), filter);
    if (hasTransparency) {
      const result = ctx.getImageData(0, 0, width, height);
      for (let p = 0; p < sourceAlpha.length; p++) result.data[p * 4 + 3] = sourceAlpha[p];
      ctx.putImageData(result, 0, 0);
    }
  } else if (filter.type === "xerox") {
    applyXerox(ctx, canvas, filter, scaleFactor);
  }
}

// Per-pixel filters: grayscale, duotone, threshold.

import { hexToRgb } from "../../model/color.js";
import { controlValues } from "../../model/controls.js";
import { DEFAULT_DUOTONE_DARK, DEFAULT_DUOTONE_LIGHT, THRESHOLD_FILTER_CONTROLS } from "../../model/pageFilters.js";
import { lumaOverWhite } from "./luma.js";

// Grayscale/duotone pixel remap, in place on whatever's painted on
// `ctx` — the shared piece of applyPageFilter (background) and
// drawImageOnCanvas (a placed image, remapped on its own offscreen
// canvas before compositing, so the remap never bleeds into
// surrounding page pixels). Halftone isn't a simple per-pixel remap
// (it replaces pixels with marks via drawHalftoneScreen), so both call
// sites branch around this function for that case instead.
export function applyColorRemap(ctx, canvas, filter) {
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  if (filter.type === "grayscale") {
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
  } else if (filter.type === "duotone") {
    const dark = hexToRgb(filter.darkColor || DEFAULT_DUOTONE_DARK);
    const light = hexToRgb(filter.lightColor || DEFAULT_DUOTONE_LIGHT);
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      data[i] = dark.r + (light.r - dark.r) * lum;
      data[i + 1] = dark.g + (light.g - dark.g) * lum;
      data[i + 2] = dark.b + (light.b - dark.b) * lum;
    }
  } else if (filter.type === "threshold") {
    const { level, inkColor, paperColor } = controlValues(filter, THRESHOLD_FILTER_CONTROLS);
    const ink = hexToRgb(inkColor);
    const paper = hexToRgb(paperColor);
    for (let i = 0; i < data.length; i += 4) {
      const lum = lumaOverWhite(data, i);
      const c = lum >= level ? paper : ink;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

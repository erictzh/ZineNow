// The photocopy (xerox) filter.

import { hexToRgb } from "../../model/color.js";
import { controlValues } from "../../model/controls.js";
import { seededNoise } from "../../model/noise.js";
import { XEROX_FILTER_CONTROLS } from "../../model/pageFilters.js";
import { lumaOverWhite } from "./luma.js";

// Photocopier look: a steep contrast curve, then toner speckle, feed
// streaks running down the page and ink worn away near the edges. Noise
// is keyed to image-space cells (not canvas pixels), so the preview and
// the higher-resolution export show the same pattern.
export function applyXerox(ctx, canvas, filter, scaleFactor) {
  const { width, height } = canvas;
  const { contrast, exposure, speckle, streaks, edgeWear, xeroxVariation, inkColor, paperColor } = controlValues(filter, XEROX_FILTER_CONTROLS);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const ink = hexToRgb(inkColor);
  const paper = hexToRgb(paperColor);
  const gain = 1 + contrast / 100 * 15;
  const cutoff = 1 - exposure / 100;
  const speckleAmount = speckle / 100;
  const wearAmount = edgeWear / 100;
  const imageW = width / scaleFactor;
  const imageH = height / scaleFactor;
  const wearZone = Math.min(imageW, imageH) * 0.1;

  // Some columns get a dark toner line, fewer a pale starved band. The
  // slider sets how many; a column's own noise sets how strong it is.
  const darkShare = 0.2 * streaks / 100;
  const paleShare = darkShare / 2;
  const streakShift = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const h = seededNoise(Math.floor(x / scaleFactor / 2.5), xeroxVariation);
    if (h > 1 - darkShare) streakShift[x] = -(0.5 + 0.5 * (h - (1 - darkShare)) / darkShare);
    else if (h < paleShare) streakShift[x] = 0.5 + 0.5 * (paleShare - h) / paleShare;
  }

  for (let y = 0; y < height; y++) {
    const imageY = y / scaleFactor;
    const cellY = Math.floor(imageY);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const imageX = x / scaleFactor;
      const cellX = Math.floor(imageX);
      const lum = lumaOverWhite(data, i) / 255;

      // Limited first, or the steep curve would leave solid blacks and
      // whites so far out of range that speckle and streaks can't show.
      let tone = Math.min(1, Math.max(0, (lum - cutoff) * gain + 0.5));
      tone += (seededNoise(cellX, xeroxVariation, cellY) - 0.5) * speckleAmount;
      tone += streakShift[x];
      // Pinholes: stray toner on white, gaps in solid black.
      if (seededNoise(cellX + 7919, xeroxVariation, cellY + 104729) < speckleAmount * 0.03) {
        tone = tone > 0.5 ? 0 : 1;
      }
      const edgeDistance = Math.min(imageX, imageY, imageW - imageX, imageH - imageY);
      if (edgeDistance < wearZone) {
        const worn = wearAmount * (1 - edgeDistance / wearZone) ** 2;
        if (seededNoise(cellX + 15485, xeroxVariation, cellY + 32452) < worn) tone = 1;
      }

      tone = Math.min(1, Math.max(0, tone));
      data[i] = ink.r + (paper.r - ink.r) * tone;
      data[i + 1] = ink.g + (paper.g - ink.g) * tone;
      data[i + 2] = ink.b + (paper.b - ink.b) * tone;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

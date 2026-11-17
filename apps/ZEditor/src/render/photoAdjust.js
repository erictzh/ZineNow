// Applies photo adjustments (light, colour, detail) to an image's pixels.

import { controlValues } from "../model/controls.js";
import { PHOTO_ADJUST_CONTROLS } from "../model/photoAdjust.js";

// Edits the canvas's pixels in place. The per-channel steps (levels,
// exposure, brightness, contrast) are baked into one lookup table; the
// rest (shadows/highlights, white balance, saturation) work on each pixel.
export function applyPhotoAdjust(ctx, canvas, ann) {
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const v = controlValues(ann, PHOTO_ADJUST_CONTROLS);
  const black = v.adjBlack;
  const white = Math.max(black + 1, v.adjWhite);
  const invGamma = 1 / (v.adjGamma / 100);
  const gain = Math.pow(2, v.adjExposure / 50); // ±100 is ±2 stops
  const offset = v.adjBrightness * 1.2;
  const c = v.adjContrast * 1.2; // ±100 gives roughly ×0.4 to ×2.7
  const contrast = (259 * (c + 255)) / (255 * (259 - c));
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const level = Math.pow(Math.min(1, Math.max(0, (i - black) / (white - black))), invGamma) * 255;
    lut[i] = ((level * gain + offset) - 128) * contrast + 128;
  }
  const shadows = v.adjShadows * 0.9, highlights = v.adjHighlights * 0.9;
  const toneMapped = shadows !== 0 || highlights !== 0;
  const warm = v.adjTemperature / 100, tint = v.adjTint / 100;
  const balanced = warm !== 0 || tint !== 0;
  const saturation = 1 + v.adjSaturation / 100;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let r = lut[data[i]], g = lut[data[i + 1]], b = lut[data[i + 2]];
    if (toneMapped) {
      // Shadows lift the dark parts, highlights pull the bright parts.
      const l = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const shift = shadows * (1 - l) * (1 - l) + highlights * l * l;
      r += shift; g += shift; b += shift;
    }
    if (balanced) {
      r *= 1 + warm * 0.3 + tint * 0.1;
      g *= 1 - tint * 0.3;
      b *= 1 - warm * 0.3 + tint * 0.1;
    }
    if (saturation !== 1) {
      const l = r * 0.299 + g * 0.587 + b * 0.114;
      r = l + (r - l) * saturation;
      g = l + (g - l) * saturation;
      b = l + (b - l) * saturation;
    }
    data[i] = r; data[i + 1] = g; data[i + 2] = b; // the clamped array rounds and limits to 0–255
  }
  ctx.putImageData(imageData, 0, 0);
}

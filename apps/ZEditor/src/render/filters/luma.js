// Brightness helpers shared by the filters (and the live SVG grayscale/duotone matrix).

// Luminance (0-255) of the pixel at `index` in canvas ImageData, as if the
// image sat on white paper. A see-through pixel stores black (0, 0, 0, 0),
// so reading its colour alone would make transparent areas come out black
// under halftone, threshold and xerox; blended over white they read white.
export function lumaOverWhite(data, index) {
  const alpha = data[index + 3] / 255;
  const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  return luma * alpha + 255 * (1 - alpha);
}

// Same Rec.601 coefficients applyColorRemap uses, as an SVG
// feColorMatrix — puts luminance into R, G, and B alike so a
// feComponentTransfer right after it can remap that single value per
// channel (see App's hidden <defs>, used by AnnotationImage's live
// grayscale/duotone preview).
export const LUMINANCE_MATRIX_VALUES = "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0";

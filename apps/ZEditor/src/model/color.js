// Colour conversions shared by CSS and canvas code.

export function rgbaCss(hex, alphaPercent) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alphaPercent / 100})`;
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}

// Colour conversions for the colour picker: hex <-> RGB <-> HSV, and reading what someone types in. Pure.
//   RGB: red, green, blue 0..255.  HSV: hue 0..360, saturation 0..1, value (brightness) 0..1.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

export const rgbToHex = (r, g, b) => "#" + hex2(r) + hex2(g) + hex2(b);

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export const hexToHsv = (hex) => { const { r, g, b } = hexToRgb(hex); return rgbToHsv(r, g, b); };
export const hsvToHex = (h, s, v) => { const { r, g, b } = hsvToRgb(h, s, v); return rgbToHex(r, g, b); };

// What a person typed or pasted, as "#rrggbb" (lower case), or null if it is not a colour: "#1a1a1a", "1A1A1A", "#fa0", "26, 26, 26",
// "rgb(26 26 26)".
export function parseColorText(text) {
  const t = String(text || "").trim();
  let m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (m) return "#" + m[1].toLowerCase();
  m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(t);
  if (m) return ("#" + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toLowerCase();
  m = /^(?:rgb\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/i.exec(t);
  if (m && [m[1], m[2], m[3]].every((n) => Number(n) <= 255)) return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

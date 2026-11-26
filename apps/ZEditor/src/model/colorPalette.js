// The colour palette grid of the picker: a row of greys, a row of vivid colours, then lighter and darker versions of each, every one
// with a name ("Light red 2", "Dark blue 1"). Generated from ten base colours by mixing with white or black. Pure.

import { hexToRgb, rgbToHex } from "./colorSpaces.js";

const GREY_NAMES = ["Black", "Dark grey 4", "Dark grey 3", "Dark grey 2", "Dark grey 1", "Grey", "Light grey 1", "Light grey 2", "Light grey 3", "White"];
const BASES = [
  ["Berry", "#980000"], ["Red", "#ff0000"], ["Orange", "#ff9900"], ["Yellow", "#ffff00"], ["Green", "#00ff00"],
  ["Cyan", "#00ffff"], ["Cornflower blue", "#4a86e8"], ["Blue", "#0000ff"], ["Purple", "#9900ff"], ["Magenta", "#ff00ff"],
];
// Light 3 is the palest. How much white (or black) is mixed in.
const LIGHT = [["light 3", 0.8], ["light 2", 0.6], ["light 1", 0.4]];
const DARK = [["dark 1", 0.2], ["dark 2", 0.4], ["dark 3", 0.6]];

const mix = (hex, target, amount) => {
  const a = hexToRgb(hex), b = target === "white" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
};

// Rows of 10: [{ name, hex }]. 8 rows: greys, vivid, light 3, light 2, light 1, dark 1, dark 2, dark 3.
export function buildPalette() {
  const rows = [GREY_NAMES.map((name, i) => ({ name, hex: rgbToHex(255 * (i / 9), 255 * (i / 9), 255 * (i / 9)) }))];
  rows.push(BASES.map(([name, hex]) => ({ name, hex })));
  for (const [label, amount] of LIGHT) rows.push(BASES.map(([name, hex]) => ({ name: `Light ${name.toLowerCase()} ${label.slice(6)}`, hex: mix(hex, "white", amount) })));
  for (const [label, amount] of DARK) rows.push(BASES.map(([name, hex]) => ({ name: `Dark ${name.toLowerCase()} ${label.slice(5)}`, hex: mix(hex, "black", amount) })));
  return rows;
}

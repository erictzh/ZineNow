// Colour conversions for the colour picker (model/colorSpaces.js).
import { hexToHsv, hexToRgb, hsvToHex, hsvToRgb, parseColorText, rgbToHex, rgbToHsv } from "../apps/ZEditor/src/model/colorSpaces.js";
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL:", msg); } else console.log("ok  :", msg); };

ok(rgbToHex(255, 128, 0) === "#ff8000" && rgbToHex(0, 0, 0) === "#000000" && rgbToHex(300, -5, 7.4) === "#ff0007", "RGB to hex, clamped and rounded");
ok(JSON.stringify(hexToRgb("#1a2b3c")) === '{"r":26,"g":43,"b":60}', "hex to RGB");
const red = rgbToHsv(255, 0, 0), grey = rgbToHsv(128, 128, 128), black = rgbToHsv(0, 0, 0), blue = rgbToHsv(0, 0, 255);
ok(red.h === 0 && red.s === 1 && red.v === 1 && blue.h === 240, "pure red and blue in HSV");
ok(grey.s === 0 && black.v === 0, "grey has no saturation, black no brightness");
ok(hsvToHex(0, 1, 1) === "#ff0000" && hsvToHex(120, 1, 1) === "#00ff00" && hsvToHex(240, 1, 1) === "#0000ff" && hsvToHex(60, 1, 1) === "#ffff00", "primary and secondary colours from HSV");
ok(hsvToHex(200, 0, 1) === "#ffffff" && hsvToHex(200, 1, 0) === "#000000", "white and black whatever the hue");
// every colour of a coarse sweep survives a round trip
let bad = 0;
for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (rgbToHex(r, g, b) !== hsvToHex(h, s, v)) bad++;
}
ok(bad === 0, "RGB to HSV and back gives the same colour (sweep of 4096 colours)");
ok(hsvToHex(-120, 1, 1) === "#0000ff" && hsvToHex(480, 1, 1) === "#00ff00", "hue wraps round");
ok(parseColorText("#1A1A1A") === "#1a1a1a" && parseColorText("1a1a1a") === "#1a1a1a" && parseColorText(" #fa0 ") === "#ffaa00", "hex typed with or without #, short form too");
ok(parseColorText("26, 26, 26") === "#1a1a1a" && parseColorText("rgb(255 0 128)") === "#ff0080" && parseColorText("rgb(255,0,128)") === "#ff0080", "RGB typed in a few ways");
ok(parseColorText("256,0,0") === null && parseColorText("blue") === null && parseColorText("") === null && parseColorText("#12") === null, "things that are not colours give null");
ok(hexToHsv("#ff8000").h > 29 && hexToHsv("#ff8000").h < 31, "orange is about 30 degrees");
if (fails) { console.log(fails + " failed"); process.exit(1); }

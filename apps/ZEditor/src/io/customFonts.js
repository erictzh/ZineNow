// Uploaded fonts: registering them with the browser and keeping them for the project file.

import { arrayBufferToBase64 } from "./base64.js";

// ---- Fonts uploaded by the user. Each is registered with the browser
// (so live text and the export canvas can both use it) and kept here as
// base64 so a saved project carries the font files it uses and looks
// the same on a PC that doesn't have them installed.
export const customFontStore = []; // [{ family, data, bold?, italic?, source? }]: source "system" = a system font embedded by Project > Embed Fonts…

// `style` ({ bold, italic }): which face of the family this file is (system fonts embedded in a project come one file per face); an uploaded font is one regular file.
export async function registerCustomFont(family, bytes, style = {}) {
  const face = new FontFace(family, bytes.slice(0), { weight: style.bold ? "700" : "400", style: style.italic ? "italic" : "normal" });
  await face.load();
  document.fonts.add(face);
}

// Reads a chosen font file, registers it and returns its family name
// (taken from the file name, made unique among `takenNames`).
export async function addCustomFontFile(file, takenNames) {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("Choose a .ttf, .otf, .woff or .woff2 font file.");
  const bytes = await file.arrayBuffer();
  const base = file.name.replace(/\.[^.]+$/, "").replace(/_+/g, " ").replace(/['"\\]/g, "").trim() || "Custom font";
  let family = base, n = 2;
  while (takenNames.includes(family)) family = `${base} ${n++}`;
  try {
    await registerCustomFont(family, bytes);
  } catch (err) {
    throw new Error("That file isn't a font the browser can read.");
  }
  customFontStore.push({ family, data: arrayBufferToBase64(bytes) });
  return family;
}

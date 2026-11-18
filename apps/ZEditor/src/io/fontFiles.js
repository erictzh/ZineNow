// Finding the font file behind a text box's font, so Export can embed it in the PDF.
//
// A browser draws text with fonts it already has; a PDF has to carry the font
// file. Two places have the bytes: fonts the user uploaded (kept for the project
// file) and the system fonts, which the browser only hands over through the Local
// Font Access API after the user allowed it ("Load Local System Fonts" in the
// font menu). Anything else (a web font, a font that wasn't loaded) has no
// file we can reach, so its text stays a picture.

import { base64ToArrayBuffer } from "./base64.js";
import { customFontStore } from "./customFonts.js";

// A face's style name ("Bold Italic", "Regular", "Oblique"...) as { italic, weight }.
function parseStyle(style) {
  const words = (style || "regular").toLowerCase().replace(/[-_]/g, " ").split(/\s+/).filter(Boolean);
  const italic = words.some((w) => w === "italic" || w === "oblique");
  const rest = words.filter((w) => w !== "italic" && w !== "oblique");
  const weight = rest.length === 0 || (rest.length === 1 && ["regular", "normal", "roman", "book"].includes(rest[0])) ? "regular" : rest.join(" ");
  return { italic, weight };
}

// One per Export: remembers the list of system fonts and the bytes already read.
export function createFontResolver() {
  let localFontsPromise = null;
  const bytesCache = new Map();

  // The system's font faces, only if the user has already allowed access (this never prompts).
  function localFonts() {
    if (!localFontsPromise) {
      localFontsPromise = (async () => {
        try {
          if (!("queryLocalFonts" in window) || !navigator.permissions || !navigator.permissions.query) return [];
          const state = await navigator.permissions.query({ name: "local-fonts" });
          return state.state === "granted" ? await window.queryLocalFonts() : [];
        } catch (err) {
          return [];
        }
      })();
    }
    return localFontsPromise;
  }

  // { key, bytes } for the face a box needs (family + bold + italic), or null.
  async function find(family, bold, italic) {
    if (!family) return null;
    const key = `${family}|${bold ? "b" : ""}${italic ? "i" : ""}`;
    if (bytesCache.has(key)) return bytesCache.get(key);
    let found = null;

    // An uploaded font is one file, so it only stands in for the regular style.
    const uploaded = customFontStore.find((f) => f.family === family);
    if (uploaded && !bold && !italic) {
      found = { key, bytes: base64ToArrayBuffer(uploaded.data) };
    } else if (!uploaded) {
      const wantWeight = bold ? "bold" : "regular";
      const faces = (await localFonts()).filter((f) => f.family.toLowerCase() === family.toLowerCase());
      const face = faces.find((f) => { const s = parseStyle(f.style); return s.italic === Boolean(italic) && s.weight === wantWeight; });
      if (face) {
        try { found = { key, bytes: await (await face.blob()).arrayBuffer() }; } catch (err) { found = null; }
      }
    }
    bytesCache.set(key, found);
    return found;
  }

  return { find };
}

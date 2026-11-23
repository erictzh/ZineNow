// Embedding the system fonts a project uses (Project menu > Embed Fonts…): finding which font faces the text uses (family + bold + italic,
// including fonts used only by a restyled stretch of text), saying for each whether it is already inside the project (an uploaded font, or
// one embedded earlier), can be read from this computer, or is just a name, and reading the font files so a saved .znow carries them.
// Reading a system font's file needs the browser's Local Font Access (Chrome and Edge): fontFiles.js does the lookup.

import { resolvePageText } from "../render/pageText.js";
import { arrayBufferToBase64 } from "./base64.js";
import { customFontStore } from "./customFonts.js";
import { createFontResolver } from "./fontFiles.js";

export const faceKey = (family, bold, italic) => family + "|" + (bold ? "b" : "") + (italic ? "i" : "");
export const faceLabel = (f) => f.family + " — " + (f.bold || f.italic ? [f.bold ? "Bold" : "", f.italic ? "Italic" : ""].filter(Boolean).join(" ") : "Regular");
const GENERIC = new Set(["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace"]);

// Every font face the text of `pages` uses: [{ key, family, bold, italic }] sorted by family, then Regular, Bold, Italic, Bold Italic.
// A restyled stretch of text (colorRuns) can have its own family / bold / italic: those count too.
export function usedFaces(pages) {
  const map = new Map();
  const add = (family, bold, italic) => { if (!family) return; const key = faceKey(family, bold, italic); if (!map.has(key)) map.set(key, { key, family, bold: Boolean(bold), italic: Boolean(italic) }); };
  for (const p of pages || []) {
    for (const a of resolvePageText(p.annotations || [])) {
      if (a.type !== "text") continue;
      add(a.fontFamily, a.bold, a.italic);
      for (const r of a.colorRuns || []) {
        if (r.fontFamily == null && r.bold == null && r.italic == null) continue;
        add(r.fontFamily != null ? r.fontFamily : a.fontFamily, r.bold != null ? r.bold : a.bold, r.italic != null ? r.italic : a.italic);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.family.localeCompare(b.family) || (a.bold - b.bold) || (a.italic - b.italic));
}

// What a face is: "uploaded" (a font file the user uploaded, always inside the project), "embedded" (a system font embedded when an earlier
// save was made: the project already carries it), "generic" (a CSS name like sans-serif: there is no file), or "system" (a font of this computer).
export function faceKind(face, store = customFontStore) {
  const exact = store.find((f) => f.family === face.family && Boolean(f.bold) === face.bold && Boolean(f.italic) === face.italic);
  if (exact) return exact.source === "system" ? "embedded" : "uploaded";
  if (store.some((f) => f.family === face.family && f.source !== "system")) return "uploaded"; // an uploaded font covers every style of its family
  if (GENERIC.has(face.family.toLowerCase())) return "generic";
  return "system";
}

// The faces with their kind and, for system fonts that this computer lets us read, their size in bytes (null when we can't read them).
// `resolver` is createFontResolver() (one per call is fine).
export async function describeFaces(pages, resolver = createFontResolver()) {
  const out = [];
  for (const f of usedFaces(pages)) {
    const kind = faceKind(f);
    let bytes = null;
    if (kind === "system") { try { const r = await resolver.find(f.family, f.bold, f.italic); bytes = r ? r.bytes.byteLength : null; } catch (e) { bytes = null; } }
    out.push({ ...f, label: faceLabel(f), kind, bytes });
  }
  return out;
}

// The system fonts to put in a saved file: [{ family, data (base64), bold, italic, source: "system" }] for every system face the text uses except
// the ones in `skip` (face keys), plus `missing` (labels of faces whose files could not be read here) and the total size.
export async function buildEmbeddedFonts(pages, skip = [], resolver = createFontResolver()) {
  const fonts = [], missing = [];
  let total = 0;
  for (const f of usedFaces(pages)) {
    if (faceKind(f) !== "system" || skip.includes(f.key)) continue;
    let found = null;
    try { found = await resolver.find(f.family, f.bold, f.italic); } catch (e) { found = null; }
    if (!found) { missing.push(faceLabel(f)); continue; }
    total += found.bytes.byteLength;
    fonts.push({ family: f.family, data: arrayBufferToBase64(found.bytes), ...(f.bold ? { bold: true } : {}), ...(f.italic ? { italic: true } : {}), source: "system" });
  }
  return { fonts, missing, total };
}

export const formatBytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

// Can this browser read the fonts installed on this computer (Chrome and Edge: the Local Font Access feature)?
export const canReadSystemFonts = () => typeof window !== "undefined" && "queryLocalFonts" in window;

// The one-time reminder that a font file inside a project is a font being shared (many fonts' licences do not allow it): shown once per browser.
const SEEN_KEY = "zeditor.fontEmbedLicenceSeen";
export function fontLicenceSeen() { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; } }
export function setFontLicenceSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* asked again next time */ } }

// The .znow project file: writing a project out, and reading one back in.

import { legacyLayerOrder } from "../model/annotations.js";
import { makeBlankThumb, renderPdfThumb } from "../render/pageRender.js";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./base64.js";
import { customFontStore, registerCustomFont } from "./customFonts.js";
import { usedFaces } from "./fontEmbed.js";

// Saves everything needed to reopen and keep editing: every loaded
// source PDF's original bytes (base64, so the file is fully
// self-contained — no need to also keep track of and re-attach the
// original PDF(s) by hand), every page's annotations and own filter,
// and the document-wide Guides/Onion Skin settings. Thumbnails are
// regenerated on load instead of saved, same reasoning as the undo
// snapshots — they're the one part that's both heavy and fully
// derivable from everything else here.
//
// Plain JSON under the hood — .znow is just a distinct extension
// so a saved project doesn't get mistaken for a generic .json
// file (or opened by something else that happens to claim it).
// `embeddedFonts`: system fonts to carry in the file ([{ family, data, bold?, italic?, source: "system" }], from io/fontEmbed.js buildEmbeddedFonts).
export function serializeProject({ title, pdfDocs, pages, textStyles, settings, embeddedFonts = [] }) {
  const docs = {};
  for (const docId of Object.keys(pdfDocs)) {
    docs[docId] = arrayBufferToBase64(pdfDocs[docId].bytes);
  }
  // Only the fonts some text actually uses are stored (uploaded ones, ones embedded by an earlier save, and the system fonts embedded now).
  // A font used only by a restyled stretch of text counts too.
  const usedFamilies = new Set(usedFaces(pages).map((f) => f.family));
  const fonts = customFontStore.filter((f) => usedFamilies.has(f.family));
  for (const e of embeddedFonts) {
    if (!fonts.some((f) => f.family === e.family && Boolean(f.bold) === Boolean(e.bold) && Boolean(f.italic) === Boolean(e.italic))) fonts.push(e);
  }
  const project = {
    version: 2, // 2: the annotation list is the stacking order
    title,
    docs,
    fonts,
    textStyles,
    pages: pages.map(({ dataUrl, ...rest }) => rest),
    settings,
  };
  return JSON.stringify(project);
}

// Reads a .znow file: re-opens its PDFs, registers its fonts (before
// anything is drawn, so text lays out in them rather than in a fallback)
// and rebuilds every page with a fresh thumbnail. `nextPageKey()` hands
// out page keys. Returns everything the editor needs to switch to it.
export async function readProjectFile(file, nextPageKey) {
  const text = await file.text();
  const project = JSON.parse(text);
  if (!project || !Array.isArray(project.pages)) throw new Error("That doesn't look like a ZEditor project file.");

  const docs = {};
  for (const docId of Object.keys(project.docs || {})) {
    const bytes = base64ToArrayBuffer(project.docs[docId]);
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    docs[docId] = { doc, bytes };
  }

  const loadedFamilies = [];
  for (const font of project.fonts || []) {
    const bold = Boolean(font.bold), italic = Boolean(font.italic);
    if (customFontStore.some((f) => f.family === font.family && f.data === font.data && Boolean(f.bold) === bold && Boolean(f.italic) === italic)) { loadedFamilies.push(font.family); continue; }
    try {
      await registerCustomFont(font.family, base64ToArrayBuffer(font.data), { bold, italic });
      customFontStore.push({ family: font.family, data: font.data, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}), ...(font.source === "system" ? { source: "system" } : {}) });
      loadedFamilies.push(font.family);
    } catch (err) { /* a damaged font falls back to the default; the text is still there */ }
  }
  const textStyles = Array.isArray(project.textStyles) ? project.textStyles.filter((s) => s && s.name && s.props) : [];

  const pages = await Promise.all(project.pages.map(async (p) => {
    const dataUrl = p.isBlank
      ? makeBlankThumb(p.width, p.height, p.rotation, undefined, p.isCanvas)
      : await renderPdfThumb(docs[p.docId].doc, p.pageNumber, p.rotation);
    const annotations = project.version >= 2 ? p.annotations : legacyLayerOrder(p.annotations || []);
    return { ...p, annotations, key: nextPageKey(), dataUrl };
  }));

  // The highest ids in use, so new pages, annotations, or an Insert PDF
  // afterward never collide with ids that came from this project file.
  let maxDocNum = 0;
  Object.keys(docs).forEach((id) => {
    const m = /^doc(\d+)$/.exec(id);
    if (m) maxDocNum = Math.max(maxDocNum, Number(m[1]));
  });
  let maxAnnId = 0;
  // Group ids ("g12") come from the same counter, so they count too: otherwise a new group could
  // reuse an existing group's id and the two would act as one.
  pages.forEach((p) => (p.annotations || []).forEach((a) => {
    maxAnnId = Math.max(maxAnnId, a.id || 0);
    const g = /^g(\d+)$/.exec(a.groupId || "");
    if (g) maxAnnId = Math.max(maxAnnId, Number(g[1]));
  }));

  // Size for blank pages added later: the first real page's, else the first page's.
  let pageSize = null;
  const firstReal = pages.find((p) => !p.isBlank);
  if (firstReal) {
    const p1 = await docs[firstReal.docId].doc.getPage(firstReal.pageNumber);
    const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
    pageSize = { width: vp1.width, height: vp1.height };
  } else if (pages.length > 0) {
    pageSize = { width: pages[0].width, height: pages[0].height };
  }

  return {
    docs, pages, loadedFamilies, textStyles, maxDocNum, maxAnnId, pageSize,
    // Projects saved before titles existed take their file's name (see the caller).
    title: typeof project.title === "string" && project.title ? project.title : null,
    settings: project.settings || {},
  };
}

// Renders whole pages: source PDF page or blank, items, filter, page number; thumbnails.

import { MAIN_SCALE, THUMB_SCALE } from "../constants.js";
import { drawAnnotationOnCanvas } from "./drawAnnotation.js";
import { applyPageFilter } from "./filters/applyFilter.js";

// Resolves which loaded pdf.js document a page belongs to. Pages can
// now come from more than one source PDF (the original load, plus any
// PDFs brought in via Insert PDF), so `pdfDocsRef` is a map of
// docId -> { doc, bytes } rather than a single ref — `bytes` is kept
// alongside the parsed doc purely so Save Project can re-embed the
// original file later without pdf.js needing to expose it itself.
export function docFor(pdfDocsRef, page) {
  const entry = pdfDocsRef.current[page.docId];
  return entry ? entry.doc : null;
}

// Real pixel size of a page at a given scale, in the same coordinate
// space annotations are positioned in (accounts for blank-page vs. PDF
// page and 90°/270° rotation swapping width/height). Used for centering
// a newly-added image on whichever page is currently selected.
export async function getPageDisplaySize(page, pdfDocsRef, scale) {
  if (page.isBlank) {
    const swapped = page.rotation % 180 !== 0;
    return {
      width: Math.round((swapped ? page.height : page.width) * scale),
      height: Math.round((swapped ? page.width : page.height) * scale),
    };
  }
  const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
  const viewport = pdfPage.getViewport({ scale, rotation: page.rotation });
  return { width: viewport.width, height: viewport.height };
}

function drawPageNumber(ctx, spec, width, height, pxPerPt) {
  const margin = spec.marginIn * 72 * pxPerPt;
  ctx.save();
  ctx.font = `${spec.size * pxPerPt}px 'Inter', sans-serif`;
  ctx.fillStyle = spec.color;
  ctx.textBaseline = spec.vertical === "top" ? "top" : "bottom";
  ctx.textAlign = spec.horizontal === "left" ? "left" : spec.horizontal === "right" ? "right" : "center";
  const x = spec.horizontal === "left" ? margin : spec.horizontal === "right" ? width - margin : width / 2;
  ctx.fillText(spec.text, x, spec.vertical === "top" ? margin : height - margin);
  ctx.restore();
}

export async function renderPageToCanvas(page, pdfDocsRef, exportScale, pageFilter, numberSpec) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let w, h;
  if (page.isBlank) {
    const swapped = page.rotation % 180 !== 0;
    w = Math.round((swapped ? page.height : page.width) * exportScale);
    h = Math.round((swapped ? page.width : page.height) * exportScale);
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  } else {
    const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
    const viewport = pdfPage.getViewport({ scale: exportScale, rotation: page.rotation });
    w = viewport.width; h = viewport.height;
    canvas.width = w; canvas.height = h;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }

  const scaleFactor = exportScale / MAIN_SCALE; // annotation coords were recorded in the editor's on-screen canvas space
  applyPageFilter(ctx, canvas, pageFilter, scaleFactor); // background only — drawn before any annotation touches the canvas
  // The annotation list is the stacking order: first is the bottom layer.
  for (const a of page.annotations || []) {
    if (!a.hidden) await drawAnnotationOnCanvas(ctx, a, scaleFactor, pageFilter);
  }
  if (numberSpec) drawPageNumber(ctx, numberSpec, w, h, exportScale);
  return canvas;
}

// Renders a blank white page straight to a data URL — no pdf.js
// involved, since a blank page has no underlying PDF page to render.

export function makeBlankThumb(width, height, rotation, scale) {
  const s = scale || THUMB_SCALE;
  const swapped = rotation % 180 !== 0;
  const w = Math.max(1, Math.round((swapped ? height : width) * s));
  const h = Math.max(1, Math.round((swapped ? width : height) * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL();
}

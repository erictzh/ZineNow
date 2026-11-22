// Renders whole pages: source PDF page or blank, items, filter, page number; thumbnails.

import { MAIN_SCALE, THUMB_SCALE } from "../constants.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { drawPageItem } from "./clipMask.js";
import { applyPageFilter } from "./filters/applyFilter.js";
import { resolvePageText } from "./pageText.js";

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

// `transparent` leaves the paper see-through (for a PNG with a transparent background): a blank page
// isn't painted white, and a PDF page is drawn without its white backing. Everything on the page is
// drawn as usual.
export async function renderPageToCanvas(page, pdfDocsRef, exportScale, pageFilter, numberSpec, transparent = false) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let w, h;
  if (page.isBlank) {
    const swapped = page.rotation % 180 !== 0;
    w = Math.round((swapped ? page.height : page.width) * exportScale);
    h = Math.round((swapped ? page.width : page.height) * exportScale);
    canvas.width = w; canvas.height = h;
    if (!transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
    const viewport = pdfPage.getViewport({ scale: exportScale, rotation: page.rotation });
    w = viewport.width; h = viewport.height;
    canvas.width = w; canvas.height = h;
    await pdfPage.render(transparent ? { canvasContext: ctx, viewport, background: "rgba(0,0,0,0)" } : { canvasContext: ctx, viewport }).promise;
  }

  const scaleFactor = exportScale / MAIN_SCALE; // annotation coords were recorded in the editor's on-screen canvas space
  // Several filters paint a white sheet, so a see-through blank page, which has no paper, skips the filter.
  await paintPageContent(ctx, canvas, page, scaleFactor, pageFilter, transparent && page.isBlank);
  if (numberSpec) drawPageNumber(ctx, numberSpec, w, h, exportScale);
  return canvas;
}

// Puts the page filter and then the page's items on a canvas that already holds the paper (a PDF page
// or blank). The filter treats the paper only (it's drawn before any item touches the canvas).
async function paintPageContent(ctx, canvas, page, scaleFactor, pageFilter, skipFilter) {
  if (!skipFilter) applyPageFilter(ctx, canvas, pageFilter, scaleFactor);
  // The annotation list is the stacking order: first is the bottom layer.
  // Threaded stories and text wrap need the whole page (render/pageText.js).
  // A clipped image is cut to the layer below it (render/clipMask.js).
  const items = resolvePageText(page.annotations || []);
  for (let i = 0; i < items.length; i++) await drawPageItem(ctx, items, i, scaleFactor, pageFilter);
}

// A sidebar thumbnail with the page's filter and items on it. `baseImage` is the page's cached base
// thumbnail (the PDF page or blank paper, no filter, no items, at THUMB_SCALE), so pdf.js isn't run
// again for every change. Resolves to a canvas.
export async function renderPageThumbWithItems(page, baseImage) {
  const canvas = document.createElement("canvas");
  canvas.width = baseImage.naturalWidth;
  canvas.height = baseImage.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(baseImage, 0, 0);
  await paintPageContent(ctx, canvas, page, THUMB_SCALE / MAIN_SCALE, page.filter || DEFAULT_PAGE_FILTER, false);
  return canvas;
}

// Renders a blank white page straight to a data URL — no pdf.js
// involved, since a blank page has no underlying PDF page to render.

// A no-paper page (`noPaper`) gets the dark workspace colour instead of white, since it has no sheet.
export function makeBlankThumb(width, height, rotation, scale, noPaper) {
  const s = scale || THUMB_SCALE;
  const swapped = rotation % 180 !== 0;
  const w = Math.max(1, Math.round((swapped ? height : width) * s));
  const h = Math.max(1, Math.round((swapped ? width : height) * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = noPaper ? "#1f1c1a" : "#ffffff";
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL();
}

// A sidebar thumbnail of one page of a loaded PDF, as a PNG data URL.
export async function renderPdfThumb(doc, pageNumber, rotation) {
  const pdfPage = await doc.getPage(pageNumber);
  const viewport = pdfPage.getViewport({ scale: THUMB_SCALE, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL();
}

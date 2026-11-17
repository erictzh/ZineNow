// Builds the finished PDF: every page rendered at export resolution and placed as an image.

import { EXPORT_SCALE } from "../constants.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { pageNumberSpec } from "../model/pageNumbers.js";
import { renderPageToCanvas } from "../render/pageRender.js";
import { canvasToArrayBuffer } from "./fileSave.js";

// Shared by "Export PDF" and "Send to ZineArranger" — both need the
// exact same rendered bytes, just handed off differently afterward.
export async function buildExportPdfBytes(pages, pdfDocsRef, pageNumbers) {
  const outDoc = await PDFLib.PDFDocument.create();
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const canvas = await renderPageToCanvas(page, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
    const pngBytes = await canvasToArrayBuffer(canvas);
    const pngImage = await outDoc.embedPng(pngBytes);
    const pageWidthPts = canvas.width / EXPORT_SCALE;
    const pageHeightPts = canvas.height / EXPORT_SCALE;
    const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
    outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
  }
  return outDoc.save();
}

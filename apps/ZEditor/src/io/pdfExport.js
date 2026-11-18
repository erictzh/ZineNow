// Builds the finished PDF: every page rendered at export resolution and placed as an image, with text that can be real text written on top of it.

import { EXPORT_SCALE } from "../constants.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { pageNumberSpec } from "../model/pageNumbers.js";
import { renderPageToCanvas } from "../render/pageRender.js";
import { resolvePageText } from "../render/pageText.js";
import { measureTextBox } from "../render/textLayout.js";
import { prepareWrapShapes } from "../render/wrapShapes.js";
import { canvasToArrayBuffer } from "./fileSave.js";
import { createVectorTextExporter } from "./vectorText.js";

// Shared by "Export PDF" and "Send to ZineArranger" — both need the
// exact same rendered bytes, just handed off differently afterward.
// `onReport(message)` is told, once the PDF is built, how much text went in as real text.
export async function buildExportPdfBytes(pages, pdfDocsRef, pageNumbers, onReport) {
  const outDoc = await PDFLib.PDFDocument.create();
  const vectorText = createVectorTextExporter(outDoc);
  await prepareWrapShapes(pages); // images that wrap text by their shape need their outline read first
  const overflowPages = []; // preflight: pages with a text frame whose text doesn't all fit
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    // Threaded stories and text wrap are worked out for the whole page first (render/pageText.js).
    const page = { ...pages[pageIdx], annotations: resolvePageText(pages[pageIdx].annotations || []) };
    const annotations = page.annotations;
    if (annotations.some((a) => a.type === "text" && !a.hidden && a.storyNextId == null && measureTextBox(a).overflow)) overflowPages.push(pageIdx + 1);
    // Text boxes that can be real text are left out of the page picture and written on top of it.
    const vectorIds = await vectorText.plan(annotations);
    const picturePage = vectorIds.size ? { ...page, annotations: annotations.filter((a) => !vectorIds.has(a.id)) } : page;
    const canvas = await renderPageToCanvas(picturePage, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
    const pngBytes = await canvasToArrayBuffer(canvas);
    const pngImage = await outDoc.embedPng(pngBytes);
    const pageWidthPts = canvas.width / EXPORT_SCALE;
    const pageHeightPts = canvas.height / EXPORT_SCALE;
    const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
    outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
    for (const ann of annotations) {
      if (vectorIds.has(ann.id)) await vectorText.draw(outPage, ann, pageHeightPts);
    }
  }
  if (onReport) {
    const overflow = overflowPages.length ? `Overset text: a text frame on page ${overflowPages.join(", ")} has more text than fits (the rest is not in the PDF).` : "";
    onReport([vectorText.describe(), overflow].filter(Boolean).join(" "));
  }
  return outDoc.save();
}

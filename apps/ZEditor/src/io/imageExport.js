// Exports one page as a picture file: a JPG, or a PNG whose paper is transparent.

import { EXPORT_SCALE } from "../constants.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { pageNumberSpec } from "../model/pageNumbers.js";
import { visibleSlot } from "../model/pageVisibility.js";
import { renderPageToCanvas } from "../render/pageRender.js";
import { prepareWrapShapes } from "../render/wrapShapes.js";

export const IMAGE_FORMATS = {
  jpg: { mime: "image/jpeg", ext: ".jpg", description: "JPEG image", transparent: false, quality: 0.95 },
  png: { mime: "image/png", ext: ".png", description: "PNG image (transparent background)", transparent: true },
};

// The page at export resolution as an image Blob. `format` is "jpg" or "png".
export async function renderPageImageBlob(pages, pageIdx, pdfDocsRef, pageNumbers, format) {
  const fmt = IMAGE_FORMATS[format];
  const page = pages[pageIdx];
  await prepareWrapShapes([page]); // images that wrap text by their shape need their outline read first
  const canvas = await renderPageToCanvas(
    page, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER,
    // A hidden page carries no number; the others are numbered among the visible pages.
    (() => { const slot = visibleSlot(pages, pageIdx); return slot ? pageNumberSpec(pageNumbers, slot.index, slot.count) : null; })(), fmt.transparent,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the page image."))), fmt.mime, fmt.quality);
  });
}

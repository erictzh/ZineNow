// Opens a PDF file with pdf.js and builds a page entry for each of its pages.

import { renderPdfThumb } from "../render/pageRender.js";

// Used by both Load PDF (a fresh document) and Insert PDF (added pages).
// `ids` hands out fresh ids: ids.docId() and ids.pageKey(). Returns the new
// docId, the { doc, bytes } entry for pdfDocsRef, the pages, and page 1's
// size (the default size for blank pages added later).
export async function importPdfFile(file, ids) {
  const bytes = await file.arrayBuffer();
  // A separate copy goes to pdf.js — it may take ownership of the
  // buffer it's given, and `bytes` itself needs to stay intact so
  // Save Project can re-embed these exact original bytes later.
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const docId = ids.docId();

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const dataUrl = await renderPdfThumb(doc, i, 0);
    pages.push({ key: ids.pageKey(), docId, pageNumber: i, rotation: 0, dataUrl, isBlank: false, annotations: [] });
  }
  const p1 = await doc.getPage(1);
  const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
  return { docId, entry: { doc, bytes }, pages, firstPageSize: { width: vp1.width, height: vp1.height } };
}

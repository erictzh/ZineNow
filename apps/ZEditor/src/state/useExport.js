// Export PDF, page pictures (JPG / transparent PNG) and Send to ZineArranger, with their busy flags.

import { pageImageFileName, titleToFileName } from "../model/documentTitle.js";
import { saveFile, savePdfBytes, writeFileHandle } from "../io/fileSave.js";
import { IMAGE_FORMATS, renderPageImageBlob } from "../io/imageExport.js";
import { buildExportPdfBytes } from "../io/pdfExport.js";
import { downloadBlob } from "../../../../shared/js/download.js";
import { sendPdfToZineArranger } from "../../../../shared/js/zineArrangerHandoff.js";

const { useState } = React;

export function useExport({ doc, status, view, project }) {
  const { pages, pdfDocsRef } = doc;
  const { setErrorMsg, setNotice } = status;
  const [exporting, setExporting] = useState(false);
  const [sendingToArranger, setSendingToArranger] = useState(false);

  // Export tells the user how much of the text went into the PDF as real text.
  const buildBytes = () => buildExportPdfBytes(pages, pdfDocsRef, view.pageNumbers, setNotice);

  async function handleExportPdf() {
    if (pages.length === 0 || exporting) return;
    setErrorMsg(null);
    setNotice(null);
    setExporting(true);
    try {
      const pdfBytes = await buildBytes();
      await savePdfBytes(pdfBytes, titleToFileName(project.docTitle, ".pdf"));
    } catch (err) {
      setErrorMsg("Couldn't export PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
  }

  // The page being edited, as a JPG or a transparent-background PNG ("jpg" | "png").
  async function handleExportImage(format) {
    const idx = doc.selectedIdx;
    if (idx === null || !pages[idx] || exporting) return;
    const fmt = IMAGE_FORMATS[format];
    setErrorMsg(null);
    setNotice(null);
    setExporting(true);
    try {
      const blob = await renderPageImageBlob(pages, idx, pdfDocsRef, view.pageNumbers, format);
      await saveFile(blob, pageImageFileName(project.docTitle, idx, pages.length, fmt.ext), fmt.mime, fmt.description, [fmt.ext]);
    } catch (err) {
      setErrorMsg(`Couldn't export ${fmt.ext.slice(1).toUpperCase()} — ` + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
  }

  // Every page as its own picture. Not in the Export menu for now (it was too bulky there), kept
  // ready to be wired to something else. Where the browser can (Chrome, Edge) you pick a folder once and
  // the files are written into it; otherwise each one is downloaded.
  async function handleExportAllImages(format) {
    if (pages.length === 0 || exporting) return;
    const fmt = IMAGE_FORMATS[format];
    const label = fmt.ext.slice(1).toUpperCase();
    setErrorMsg(null);
    setNotice(null);
    setExporting(true);
    try {
      let folder = null;
      if (typeof window.showDirectoryPicker === "function") {
        try {
          folder = await window.showDirectoryPicker({ mode: "readwrite" });
        } catch (err) {
          if (err && err.name === "AbortError") return; // closed the folder dialog: nothing to do
          // any other refusal: download the files instead
        }
      }
      for (let i = 0; i < pages.length; i++) {
        setNotice(`Exporting ${label}: page ${i + 1} of ${pages.length}…`);
        const blob = await renderPageImageBlob(pages, i, pdfDocsRef, view.pageNumbers, format);
        const name = pageImageFileName(project.docTitle, i, pages.length, fmt.ext);
        if (folder) await writeFileHandle(await folder.getFileHandle(name, { create: true }), blob);
        else { downloadBlob(blob, name); await new Promise((r) => setTimeout(r, 300)); } // spaced out so the browser takes them all
      }
      setNotice(`Exported ${pages.length} page${pages.length === 1 ? "" : "s"} as ${label}${folder ? ` to "${folder.name}"` : ""}.`);
    } catch (err) {
      setNotice(null);
      setErrorMsg(`Couldn't export ${label} — ` + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
  }

  async function handleSendToZineArranger() {
    if (pages.length === 0 || exporting || sendingToArranger) return;
    setErrorMsg(null);
    setSendingToArranger(true);
    try {
      await sendPdfToZineArranger(buildBytes, titleToFileName(project.docTitle, ".pdf"));
    } catch (err) {
      setErrorMsg("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setSendingToArranger(false);
    }
  }

  return { exporting, sendingToArranger, handleExportPdf, handleExportImage, handleExportAllImages, handleSendToZineArranger };
}

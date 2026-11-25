// Export PDF, page pictures (JPG / transparent PNG), selected layers as SVG and Send to ZineArranger, with their busy flags.

import { pageImageFileName, titleToFileName } from "../model/documentTitle.js";
import { saveFile, savePdfBytes, writeFileHandle } from "../io/fileSave.js";
import { IMAGE_FORMATS, renderPageImageBlob } from "../io/imageExport.js";
import { buildExportPdfBytes } from "../io/pdfExport.js";
import { layersToSvg, pagesToSvg } from "../io/svgExport.js";
import { layerName } from "../model/layerNames.js";
import { resolvePageText } from "../render/pageText.js";
import { downloadBlob } from "../../../../shared/js/download.js";
import { sendPdfToZineArranger } from "../../../../shared/js/zineArrangerHandoff.js";

const { useState } = React;

export function useExport({ doc, status, view, project, selection }) {
  const { pages, pdfDocsRef } = doc;
  const { setErrorMsg, setNotice } = status;
  const [exporting, setExporting] = useState(false);
  const [sendingToArranger, setSendingToArranger] = useState(false);

  // Export tells the user how much of the text went into the PDF as real text.
  const buildBytes = () => buildExportPdfBytes(pages, pdfDocsRef, view.pageNumbers, setNotice, { bleed: view.exportBleed, cropMarks: view.exportCropMarks });

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

  // Layers as an SVG file: `ids` (default: the selection), cropped to them, with a see-through
  // background. Nothing else on the page goes in. Says afterwards what went in as pictures.
  function svgLayersFor(ids) {
    const page = pages[doc.selectedIdx];
    if (!page) return [];
    const wanted = new Set(ids || selection.selectedAnnotationIds());
    return resolvePageText(page.annotations || [], pages).filter((a) => wanted.has(a.id) && !a.hidden);
  }
  // What an SVG file did not carry as live vectors, for the notice after saving.
  function svgNotes(result) {
    const notes = [];
    if (result.pictures) notes.push(`${result.pictures} layer${result.pictures === 1 ? " went" : "s went"} in as a picture (photos, imported pages, and text or shapes with effects SVG can't hold)`);
    if (result.outlined) notes.push(`${result.outlined} text box${result.outlined === 1 ? " was" : "es were"} turned into outlines`);
    if (result.fonts.length) {
      notes.push(view.svgOutlineText
        ? `${result.fonts.join(", ")} could not be outlined (the font file isn't available: upload it in the font menu or allow Load Local System Fonts), so that text stays live text and needs the font installed`
        : `text uses ${result.fonts.join(", ")}: it looks right where ${result.fonts.length === 1 ? "that font is" : "those fonts are"} installed`);
    }
    if (result.clipped) notes.push("clipping masks aren't applied (clipped layers go in whole)");
    return notes;
  }
  // The page being edited, or every page side by side, as an SVG for Illustrator: each page a group, each layer a named group inside it.
  async function handleExportPagesSvg(allPages) {
    const indices = allPages ? pages.map((_, i) => i) : doc.selectedIdx !== null ? [doc.selectedIdx] : [];
    if (!indices.length || exporting) return;
    setErrorMsg(null);
    setNotice(null);
    setExporting(true);
    try {
      const result = await pagesToSvg(pages, indices, pdfDocsRef, { outlineText: view.svgOutlineText });
      const name = allPages || pages.length === 1 ? titleToFileName(project.docTitle, ".svg") : pageImageFileName(project.docTitle, indices[0], pages.length, ".svg");
      const saved = await saveFile(result.svg, name, "image/svg+xml", "SVG image", [".svg"]);
      if (saved === "cancelled") return;
      const notes = svgNotes(result);
      setNotice((allPages ? `Saved ${indices.length} page${indices.length === 1 ? "" : "s"} as one SVG.` : "Saved the page as SVG.") + (notes.length ? " Note: " + notes.join("; ") + "." : ""));
    } catch (err) {
      setErrorMsg("Couldn't save SVG — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setExporting(false);
    }
  }
  async function handleExportSvg(ids) {
    const items = svgLayersFor(ids);
    if (!items.length || exporting) return;
    setErrorMsg(null);
    setNotice(null);
    setExporting(true);
    try {
      const result = await layersToSvg(items, doc.pageFilter, { outlineText: view.svgOutlineText });
      if (!result) { setNotice("Nothing visible to save as SVG."); return; }
      const name = items.length === 1 ? layerName(items[0]) : project.docTitle;
      const saved = await saveFile(result.svg, titleToFileName(name, ".svg"), "image/svg+xml", "SVG image", [".svg"]);
      if (saved === "cancelled") return;
      const notes = svgNotes(result);
      setNotice(notes.length ? "Saved SVG. Note: " + notes.join("; ") + "." : `Saved SVG (${items.length} layer${items.length === 1 ? "" : "s"}, all vector).`);
    } catch (err) {
      setErrorMsg("Couldn't save SVG — " + (err && err.message ? err.message : "unknown error"));
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

  return {
    exporting, sendingToArranger, handleExportPdf, handleExportImage, handleExportAllImages, handleSendToZineArranger,
    handleExportSvg, handleExportPagesSvg, canExportSvg: () => svgLayersFor().length > 0,
  };
}

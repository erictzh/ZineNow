// Export PDF and Send to ZineArranger, with their busy flags.

import { titleToFileName } from "../model/documentTitle.js";
import { savePdfBytes } from "../io/fileSave.js";
import { buildExportPdfBytes } from "../io/pdfExport.js";
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

  return { exporting, sendingToArranger, handleExportPdf, handleSendToZineArranger };
}

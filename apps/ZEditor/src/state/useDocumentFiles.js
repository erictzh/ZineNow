// Starting and growing a document: Load PDF, New blank document, and Insert PDF (with its "insert after page" step).

import { stripExtension, titleStamp } from "../model/documentTitle.js";
import { makeBlankThumb } from "../render/pageRender.js";
import { importPdfFile } from "../io/pdfImport.js";
import { announceDocumentOpened } from "./useZoom.js";

const { useState, useRef } = React;

export function useDocumentFiles({ doc, history, status, project, selection, dialogs }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef, ids } = doc;
  const { setLoading, setErrorMsg } = status;
  const fileInputRef = useRef(null);
  const insertPdfInputRef = useRef(null);
  // Insert PDF — holds the chosen file while the "Insert after page"
  // dialog is open; the actual insert only happens on confirm.
  const [pendingInsertFile, setPendingInsertFile] = useState(null);
  const [insertAfterPage, setInsertAfterPage] = useState(0);

  async function handleFile(file) {
    setErrorMsg(null);
    setLoading(true);
    try {
      const imported = await importPdfFile(file, ids);
      pdfDocsRef.current = { [imported.docId]: imported.entry }; // fresh start — drop any previously loaded docs
      if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
      setPages(imported.pages);
      setSelectedIdx(imported.pages.length > 0 ? 0 : null);
      setSelectedPageIndices([]);
      history.clearHistory(); // loading a document is a fresh start, not an undoable step
      project.startNewDocument(stripExtension(file.name) + " - " + titleStamp());
      announceDocumentOpened(); // the page in the middle of the view at 100%
    } catch (err) {
      setErrorMsg("Couldn't load that PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function handleLoadClick() {
    fileInputRef.current && fileInputRef.current.click();
  }

  function handleFileInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) handleFile(file);
  }

  // Starts a fresh document of blank pages at the chosen size, replacing
  // whatever was open (the caller has already confirmed that where it
  // matters). Orientation is baked into width/height rather than a
  // rotation, so page 1 isn't "rotated" from the user's point of view.
  function handleCreateBlankDocument({ width, height, pageCount }) {
    dialogs.setNewDocOpen(false);
    setErrorMsg(null);
    pdfDocsRef.current = {};
    pageSizeRef.current = { width, height }; // new blank pages added later match this
    const thumb = makeBlankThumb(width, height, 0);
    const newPages = Array.from({ length: pageCount }, () => ({
      key: nextKeyRef.current++,
      isBlank: true,
      rotation: 0,
      width,
      height,
      dataUrl: thumb,
      annotations: [],
    }));
    setPages(newPages);
    setSelectedIdx(0);
    setSelectedPageIndices([]);
    selection.setSelectedAnnId(null);
    selection.setSelectedAnnIds([]);
    history.clearHistory();
    project.startNewDocument("New Zine - " + titleStamp());
    announceDocumentOpened(); // the page in the middle of the view at 100%
  }

  function handleNewDocumentOpenPdf() {
    dialogs.setNewDocOpen(false);
    handleLoadClick();
  }

  function handleInsertPdfClick() {
    insertPdfInputRef.current && insertPdfInputRef.current.click();
  }

  // Picking a file doesn't insert it yet — it opens the "Insert after
  // page" dialog first (see InsertPdfDialog), defaulting to right
  // after whichever page is currently selected.
  function handleInsertPdfInputChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setInsertAfterPage(selectedIdx !== null ? selectedIdx + 1 : pages.length);
    setPendingInsertFile(file);
  }

  async function handleConfirmInsertPdf() {
    const file = pendingInsertFile;
    const atIndex = Math.max(0, Math.min(pages.length, insertAfterPage));
    setPendingInsertFile(null);
    if (!file) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const imported = await importPdfFile(file, ids);
      pdfDocsRef.current[imported.docId] = imported.entry; // additive — existing docs stay loaded
      if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
      history.recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.slice();
        next.splice(atIndex, 0, ...imported.pages);
        return next;
      });
      setSelectedIdx(atIndex);
      setSelectedPageIndices([]);
    } catch (err) {
      setErrorMsg("Couldn't insert that PDF — " + (err && err.message ? err.message : "unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return {
    fileInputRef, insertPdfInputRef,
    handleFile, handleLoadClick, handleFileInputChange, handleCreateBlankDocument, handleNewDocumentOpenPdf,
    handleInsertPdfClick, handleInsertPdfInputChange,
    pendingInsertFile, setPendingInsertFile, insertAfterPage, setInsertAfterPage, handleConfirmInsertPdf,
  };
}

// Undo/redo: snapshots of the pages and page selection, with rapid edits merged into one step.

import { MAX_UNDO_HISTORY, UNDO_COALESCE_MS } from "../model/history.js";
import { docFor, makeBlankThumb, renderPdfThumb } from "../render/pageRender.js";

const { useState, useRef } = React;

// Each entry is {pages, selectedIdx, selectedPageIndices}, with each
// page's dataUrl thumbnail stripped out before storing (see
// stripDataUrls): it's fully derivable from pageNumber/rotation/isBlank,
// and at several KB–100KB+ per page as a base64 PNG, it's by far the
// heaviest part of a page object. Everything else (annotations
// included) is already produced through this app's existing
// immutable-update style — unrelated pages/annotations keep their
// same object references across a change — so these snapshots share
// structure with each other for free rather than deep-cloning.
function stripDataUrls(pagesArr) {
  return pagesArr.map(({ dataUrl, ...rest }) => rest);
}

export function useHistory({ pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef }) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const lastCommitRef = useRef({ time: 0, key: null });

  // Call BEFORE a mutating setPages, with the CURRENT (pre-mutation)
  // pages/selectedIdx still in scope, to snapshot what Undo should
  // restore. `coalesceKey` lets repeated calls from the same ongoing
  // gesture (same key, within UNDO_COALESCE_MS of the last one) skip
  // pushing another entry — so a whole drag, slider tug, or burst of
  // keystrokes lands as one undo step instead of one per event. Pass
  // no key for anything that's already a single discrete action
  // (a click, a drop) — it always gets its own step.
  function recordUndoCheckpoint(coalesceKey) {
    const now = Date.now();
    if (coalesceKey && lastCommitRef.current.key === coalesceKey && now - lastCommitRef.current.time < UNDO_COALESCE_MS) {
      lastCommitRef.current.time = now;
      return;
    }
    lastCommitRef.current = { time: now, key: coalesceKey || null };
    setUndoStack((stack) => {
      const next = [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }];
      return next.length > MAX_UNDO_HISTORY ? next.slice(next.length - MAX_UNDO_HISTORY) : next;
    });
    setRedoStack([]);
  }

  // Loading or starting a document is a fresh start, not an undoable step.
  function clearHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  // Re-attaches each restored page's thumbnail — reusing the current
  // page with the same key/rotation/size when it's unchanged (the
  // common case for an undo/redo that only touched one page) instead
  // of re-rendering every thumbnail on every step.
  async function restoreSnapshot(snapshot) {
    const currentByKey = new Map(pages.map((p) => [p.key, p]));
    const withThumbs = await Promise.all(snapshot.pages.map(async (p) => {
      const existing = currentByKey.get(p.key);
      const reusable = existing && existing.dataUrl && existing.rotation === p.rotation &&
        existing.isBlank === p.isBlank && existing.pageNumber === p.pageNumber &&
        existing.docId === p.docId && existing.width === p.width && existing.height === p.height;
      if (reusable) return { ...p, dataUrl: existing.dataUrl };
      const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation, undefined, p.isCanvas) : await renderPdfThumb(docFor(pdfDocsRef, p), p.pageNumber, p.rotation);
      return { ...p, dataUrl };
    }));
    setPages(withThumbs);
    setSelectedIdx(snapshot.selectedIdx);
    setSelectedPageIndices(snapshot.selectedPageIndices);
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
    lastCommitRef.current = { time: 0, key: null }; // next edit shouldn't coalesce with whatever came before the undo
    restoreSnapshot(entry);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
    lastCommitRef.current = { time: 0, key: null };
    restoreSnapshot(entry);
  }

  return { undoStack, redoStack, recordUndoCheckpoint, clearHistory, handleUndo, handleRedo };
}

// Page operations from the sidebar: rotate, insert a blank page, delete, reorder.

import { DEFAULT_PAGE_SIZE } from "../constants.js";
import { orderAfterMove } from "../model/annotations.js";
import { removePagesKeepingStories } from "../model/text/threads.js";
import { docFor, makeBlankThumb, renderPdfThumb } from "../render/pageRender.js";

export function usePageOps({ doc, history, selection }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef } = doc;
  const { recordUndoCheckpoint } = history;
  const { pagesActedOn } = selection;

  async function handleRotate(idx) {
    const updatesByKey = new Map();
    for (const i of pagesActedOn(idx)) {
      const target = pages[i];
      const rotation = (target.rotation + 90) % 360;
      const dataUrl = target.isBlank
        ? makeBlankThumb(target.width, target.height, rotation, undefined, target.isCanvas)
        : await renderPdfThumb(docFor(pdfDocsRef, target), target.pageNumber, rotation);
      updatesByKey.set(target.key, { rotation, dataUrl });
    }
    recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => (updatesByKey.has(p.key) ? { ...p, ...updatesByKey.get(p.key) } : p)));
  }

  function handleInsertBlank(atIndex) {
    const size = pageSizeRef.current || DEFAULT_PAGE_SIZE;
    const newPage = {
      key: nextKeyRef.current++,
      isBlank: true,
      rotation: 0,
      width: size.width,
      height: size.height,
      ...(size.bleedMm > 0 ? { bleedMm: size.bleedMm } : {}),
      dataUrl: makeBlankThumb(size.width, size.height, 0),
      annotations: [],
    };
    recordUndoCheckpoint();
    setPages((prev) => {
      const next = prev.slice();
      next.splice(atIndex, 0, newPage);
      return next;
    });
    setSelectedIdx(atIndex);
    setSelectedPageIndices([]);
  }

  // The crossed-out eye: hides the page (or every page of the selection it is part of) from Export PDF, Send to ZineArranger and the page numbers,
  // or brings it back. Hidden pages stay in the project.
  function handleToggleHidden(idx) {
    const targets = pagesActedOn(idx);
    const allHidden = targets.every((i) => pages[i] && pages[i].hidden);
    recordUndoCheckpoint();
    setPages((prev) => prev.map((p, i) => (targets.includes(i) ? { ...p, hidden: allHidden ? undefined : true } : p)));
  }

  function handleDelete(idx) {
    recordUndoCheckpoint();
    setPages((prev) => removePagesKeepingStories(prev, [idx])); // a story that ran through this page carries on across the gap
    setSelectedIdx((prevSel) => {
      if (prevSel === null) return null;
      if (idx === prevSel) return null;
      if (idx < prevSel) return prevSel - 1;
      return prevSel;
    });
  }

  // Deletes every currently shift-selected page at once, rather than
  // one at a time — unlike a single delete, there's no single obvious
  // "next" page to land on afterward, so this just clears selection.
  function handleDeleteSelectedPages() {
    if (selectedIdx === null) return;
    const idxToDelete = new Set([selectedIdx, ...selectedPageIndices]);
    recordUndoCheckpoint();
    setPages((prev) => removePagesKeepingStories(prev, [...idxToDelete]));
    setSelectedIdx(null);
    setSelectedPageIndices([]);
  }

  // Routes a specific thumbnail's own trash-icon click: deletes just
  // that page normally, unless it's part of an active multi-selection,
  // in which case the whole selection goes together.
  function handleDeleteThumbnail(idx) {
    if (selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx))) {
      handleDeleteSelectedPages();
    } else {
      handleDelete(idx);
    }
  }

  // `insertBefore` is a slot in the current, pre-move page list. Moved
  // pages keep their document order, not the order they were selected.
  function handleReorder(fromIndices, insertBefore) {
    const newOrder = orderAfterMove(pages.length, fromIndices, insertBefore);
    if (!newOrder) return;

    const newIdxOf = new Array(newOrder.length);
    newOrder.forEach((oldIdx, newIdx) => { newIdxOf[oldIdx] = newIdx; });

    recordUndoCheckpoint();
    setPages((prev) => newOrder.map((oldIdx) => prev[oldIdx]));
    setSelectedIdx((prevSel) => (prevSel === null ? null : newIdxOf[prevSel]));
    setSelectedPageIndices((prevSel) => prevSel.map((oldIdx) => newIdxOf[oldIdx]));
  }

  return { handleRotate, handleInsertBlank, handleToggleHidden, handleDelete, handleDeleteSelectedPages, handleDeleteThumbnail, handleReorder };
}

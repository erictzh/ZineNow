// Page > Size: set the paper size of the current page (or of every blank page). One undo step; items keep their places.

import { resizedPage } from "../model/pageSize.js";
import { makeBlankThumb } from "../render/pageRender.js";

export function usePageSize({ doc, history, status }) {
  const { pages, setPages, selectedIdx, pageSizeRef } = doc;

  function setPageSizeMm(widthMm, heightMm, allPages) {
    const targets = new Set(pages.map((p, i) => ((allPages || i === selectedIdx) && p.isBlank && !p.isCanvas ? p.key : null)).filter((k) => k !== null));
    if (!targets.size) return;
    history.recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => {
      if (!targets.has(p.key)) return p;
      const next = resizedPage(p, widthMm, heightMm);
      return { ...p, width: next.width, height: next.height, dataUrl: makeBlankThumb(next.width, next.height, p.rotation) };
    }));
    const sel = pages[selectedIdx];
    if (allPages && sel && sel.isBlank) { const next = resizedPage(sel, widthMm, heightMm); pageSizeRef.current = { ...(pageSizeRef.current || {}), width: next.width, height: next.height }; }
    status.setNotice("Page size set to " + widthMm + " × " + heightMm + " mm on " + (targets.size === 1 ? "this page" : targets.size + " pages") + ". Your items stayed where they were. Undo takes it back.");
  }
  return { setPageSizeMm };
}

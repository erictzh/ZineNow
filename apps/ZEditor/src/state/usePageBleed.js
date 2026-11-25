// Page > Bleed: set the bleed of the current page (or of every blank page). The page grows or shrinks by the change on every
// side and its items move with the trim, so nothing shifts relative to the trimmed page. One undo step.

import { MAIN_SCALE } from "../constants.js";
import { withBleed } from "../model/bleed.js";
import { translatedAnnotation } from "../model/annotations.js";
import { makeBlankThumb } from "../render/pageRender.js";

export function usePageBleed({ doc, history, status }) {
  const { pages, setPages, selectedIdx, pageSizeRef } = doc;

  function setPageBleed(mm, allPages) {
    const targets = new Set(pages.map((p, i) => ((allPages || i === selectedIdx) && p.isBlank && !p.isCanvas ? p.key : null)).filter((k) => k !== null));
    if (!targets.size) return;
    history.recordUndoCheckpoint();
    setPages((prev) => prev.map((p) => {
      if (!targets.has(p.key)) return p;
      const next = withBleed(p, mm);
      if (next.shiftPt === 0 && (p.bleedMm || 0) === next.bleedMm) return p;
      const shift = next.shiftPt * MAIN_SCALE;
      return {
        ...p, width: next.width, height: next.height, bleedMm: next.bleedMm,
        dataUrl: makeBlankThumb(next.width, next.height, p.rotation),
        annotations: shift ? (p.annotations || []).map((a) => translatedAnnotation(a, shift, shift)) : p.annotations,
      };
    }));
    // Pages added later follow the size of the pages they are added to (the default size is the first document's).
    const sel = pages[selectedIdx];
    if (allPages && sel && sel.isBlank) pageSizeRef.current = { ...(pageSizeRef.current || {}), width: withBleed(sel, mm).width, height: withBleed(sel, mm).height, bleedMm: withBleed(sel, mm).bleedMm };
    status.setNotice(Number(mm) > 0
      ? `Bleed set to ${withBleed({ width: 0, height: 0 }, mm).bleedMm} mm on ${targets.size === 1 ? "this page" : targets.size + " pages"}. The page grew; the dotted line marks the trim. Undo takes it back.`
      : `Bleed removed from ${targets.size === 1 ? "this page" : targets.size + " pages"}.`);
  }
  return { setPageBleed };
}

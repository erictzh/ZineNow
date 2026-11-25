// Page > Layout: add a ready-made layout to the current page (beneath what is there) or as a new page after it.
// The geometry is model/pageLayouts.js, the items (grey picture slots, lorem ipsum that fits) are render/layoutItems.js.

import { DEFAULT_PAGE_SIZE, MAIN_SCALE, POINTS_PER_INCH } from "../constants.js";
import { layoutByKey } from "../model/pageLayouts.js";
import { buildLayoutItems } from "../render/layoutItems.js";
import { getPageDisplaySize, makeBlankThumb } from "../render/pageRender.js";

export function useLayouts({ doc, history, edits, view, toolDefaults, status }) {
  const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, pageSizeRef } = doc;
  const { recordUndoCheckpoint } = history;

  // The Page Guide's margin, when the guide is on (so a layout stays inside it).
  const guide = () => ({ on: view.guidesOn, format: view.guideFormat, marginIn: view.guideMarginIn, pxPerInch: POINTS_PER_INCH * MAIN_SCALE });
  const items = (layout, size) => buildLayoutItems({ layout, page: size, settings: view.layoutSettings, defaults: toolDefaults, guide: guide(), nextId: () => nextAnnIdRef.current++ });

  // Adds the layout to the selected page, under the items already there (so they stay on top). One undo step.
  async function addLayoutToPage(key) {
    const layout = layoutByKey(key);
    if (!layout || selectedIdx === null || !pages[selectedIdx]) return;
    const size = await getPageDisplaySize(pages[selectedIdx], pdfDocsRef, MAIN_SCALE);
    const made = items(layout, size);
    edits.updateAnnotationsFor(selectedIdx, (anns) => [...made, ...anns]);
    status.setNotice(`Added the "${layout.label}" layout under the items on this page. Undo takes it off.`);
  }

  // A new blank page after the selected one (or at the end), holding the layout. Same size as the selected blank page.
  function addPageWithLayout(key) {
    const layout = layoutByKey(key);
    if (!layout) return;
    const current = selectedIdx !== null ? pages[selectedIdx] : null;
    const pts = current && current.isBlank ? { width: current.width, height: current.height } : (pageSizeRef.current || DEFAULT_PAGE_SIZE);
    const made = items(layout, { width: pts.width * MAIN_SCALE, height: pts.height * MAIN_SCALE });
    const newPage = {
      key: nextKeyRef.current++, isBlank: true, rotation: 0, width: pts.width, height: pts.height,
      dataUrl: makeBlankThumb(pts.width, pts.height, 0), annotations: made,
    };
    const at = selectedIdx !== null ? selectedIdx + 1 : pages.length;
    recordUndoCheckpoint();
    setPages((prev) => { const next = prev.slice(); next.splice(at, 0, newPage); return next; });
    setSelectedIdx(at);
    setSelectedPageIndices([]);
    status.setNotice(`Added a new page with the "${layout.label}" layout.`);
  }

  return { addLayoutToPage, addPageWithLayout };
}

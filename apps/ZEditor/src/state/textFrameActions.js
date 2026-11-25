// Threading text frames: "Link to next frame" (a new empty frame the story continues into) and "Unlink next frame".

import { MAIN_SCALE } from "../constants.js";
import { ptToPx, pxToPt } from "../model/text/textLook.js";
import { storyProps } from "../model/text/threads.js";
import { getPageDisplaySize } from "../render/pageRender.js";
import { measureTextBox } from "../render/textLayout.js";

const FRAME_GAP = 12; // editor px between a frame and the one made after it

// `view` is the frame as laid out (render/pageText.js), so its size is the size you see.
export function makeTextFrameActions({ pages, selectedIdx, pdfDocsRef, nextAnnIdRef, updateAnnotationsFor, updatePagesFor, setSelectedAnnId, setSelectedAnnIds }) {
  // Makes a new frame beside the box (or below it when there's no room) and threads the box into it.
  // The box becomes a fixed frame if it wasn't one: it keeps its current width and height.
  async function linkNextFrame(view) {
    const pageIdx = selectedIdx;
    if (pageIdx === null) return;
    const page = pages[pageIdx];
    const src = (page.annotations || []).find((a) => a.id === view.id);
    if (!src || src.type !== "text" || view.ransom || view.curve || view.vertical === "stacked") return;
    if ((page.annotations || []).some((a) => a.type === "text" && a.threadFrom === src.id)) return;
    const size = measureTextBox(view);
    const width = src.width || Math.round(size.width);
    const frameHeight = src.frameHeight > 0 ? src.frameHeight : Math.max(12, Math.round(pxToPt(size.height)));
    const heightPx = ptToPx(frameHeight);
    const display = await getPageDisplaySize(page, pdfDocsRef, MAIN_SCALE);
    let x = src.x + width + FRAME_GAP, y = src.y;
    if (x + width > display.width) { x = src.x; y = src.y + heightPx + FRAME_GAP; }
    x = Math.max(0, Math.min(x, display.width - width));
    y = Math.max(0, Math.min(y, display.height - heightPx));
    const id = nextAnnIdRef.current++;
    updateAnnotationsFor(pageIdx, (anns) => [
      ...anns.map((a) => (a.id === src.id ? { ...a, width, frameHeight } : a)),
      { id, type: "text", text: "", x, y, width, frameHeight, columns: src.columns, columnGap: src.columnGap, threadFrom: src.id },
    ]);
    setSelectedAnnId(id);
    setSelectedAnnIds([]);
  }

  // Cuts the thread after this frame (the next frame can be on another page): it becomes an empty box of its own
  // (keeping the story's look), and the text that no longer fits shows the red + overflow marker.
  function unlinkNextFrame(view) {
    if (selectedIdx === null) return;
    updatePagesFor((all) => {
      const holds = (id) => (p) => (p.annotations || []).some((a) => a.id === id);
      const nextPage = all.findIndex((p) => (p.annotations || []).some((a) => a.type === "text" && a.threadFrom === view.id));
      if (nextPage < 0) return all;
      const next = all[nextPage].annotations.find((a) => a.type === "text" && a.threadFrom === view.id);
      const headId = view.storyHeadId != null ? view.storyHeadId : view.id;
      const headPage = all.findIndex(holds(headId));
      const head = headPage >= 0 ? all[headPage].annotations.find((a) => a.id === headId) : view;
      return all.map((p, i) => (i !== nextPage ? p : {
        ...p,
        annotations: p.annotations.map((a) => (a.id === next.id
          ? { ...a, ...storyProps(head), text: "", colorRuns: undefined, styleOverrides: head.styleOverrides, threadFrom: undefined }
          : a)),
      }));
    });
  }

  return { linkNextFrame, unlinkNextFrame };
}

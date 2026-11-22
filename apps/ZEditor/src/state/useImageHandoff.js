// A picture sent from another ZineNow app (Ai Tools (Local)'s "Send to ZEditor"): shared/js/imageHandoff.js.
// A fresh ZEditor tab has no document, so one is made for it: a "no paper" canvas page (it grows as needed) with the picture on it.
// If a document is already open the picture is just added to the selected page.

import { MAIN_SCALE } from "../constants.js";
import { ZEDITOR_READY_MESSAGE, listenForHandoffImage } from "../../../../shared/js/imageHandoff.js";

const { useEffect, useRef } = React;

const SHOW_MAX = 800; // editor px: the picture is shown at most this big on the new canvas
const MARGIN = 80;    // editor px of canvas round it

export function useImageHandoff({ doc, files, edits, selection }) {
  const latest = useRef(null);
  latest.current = { doc, files, edits, selection };

  useEffect(() => listenForHandoffImage(ZEDITOR_READY_MESSAGE, async (file, fromOpener, meta) => {
    const { doc: d, files: f, edits: ed, selection: s } = latest.current;
    if (d.pages.length > 0) {
      // a result coming back for a layer sent out earlier ("Open in Ai Tools"): a new layer on top, exactly over the original
      const idx = meta && meta.pageKey != null ? d.pages.findIndex((p) => p.key === meta.pageKey) : -1;
      if (meta && idx >= 0 && Number.isFinite(meta.width) && Number.isFinite(meta.height)) {
        try {
          const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
          const bmp = await createImageBitmap(file);
          const naturalWidth = bmp.width, naturalHeight = bmp.height; bmp.close && bmp.close();
          const id = d.nextAnnIdRef.current++;
          ed.updateAnnotationsFor(idx, (anns) => [...anns, { id, type: "image", x: meta.x, y: meta.y, width: meta.width, height: meta.height, angle: meta.angle || undefined, naturalWidth, naturalHeight, src, name: (meta.name || "picture") + " (AI)" }]);
          if (d.selectedIdx !== idx) d.setSelectedIdx(idx);
          s.setSelectedAnnId(id);
        } catch (err) { window.alert("The picture couldn't be added: " + (err && err.message ? err.message : err)); }
        return;
      }
      ed.addImageAnnotationFromFile(file, d.selectedIdx === null ? 0 : d.selectedIdx);
      return;
    }
    try {
      const src = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, SHOW_MAX / Math.max(bmp.width, bmp.height));
      const width = bmp.width * k, height = bmp.height * k;
      const naturalWidth = bmp.width, naturalHeight = bmp.height;
      bmp.close && bmp.close();
      // a new no-paper document just big enough for it (the page sizes are in points)
      f.handleCreateBlankDocument({ width: (width + 2 * MARGIN) / MAIN_SCALE, height: (height + 2 * MARGIN) / MAIN_SCALE, pageCount: 1, canvas: true });
      const id = d.nextAnnIdRef.current++;
      // set straight on the new page: creating a document starts the history afresh, so this must not be an undo step of its own
      d.setPages((prev) => prev.map((p, i) => (i === 0 ? { ...p, annotations: [{ id, type: "image", x: MARGIN, y: MARGIN, width, height, naturalWidth, naturalHeight, src, name: file.name ? file.name.replace(/\.[^.]+$/, "") : undefined }] } : p)));
    } catch (err) {
      window.alert("The picture couldn't be opened: " + (err && err.message ? err.message : err));
    }
  }), []);
}

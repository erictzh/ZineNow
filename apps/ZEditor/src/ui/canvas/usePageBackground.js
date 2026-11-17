// Draws the page's background (its PDF page, or white for a blank page) with the page filter into a canvas.

import { MAIN_SCALE } from "../../constants.js";
import { applyPageFilter } from "../../render/filters/applyFilter.js";
import { docFor } from "../../render/pageRender.js";

const { useState, useRef, useEffect } = React;

// Returns the canvas ref to attach and the drawn size in editor px.
// Redraws when the page, its rotation or its filter changes.
export function usePageBackground(page, pdfDocsRef, pageFilter) {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      let w, h;
      if (page.isBlank) {
        const swapped = page.rotation % 180 !== 0;
        w = Math.round((swapped ? page.height : page.width) * MAIN_SCALE);
        h = Math.round((swapped ? page.width : page.height) * MAIN_SCALE);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      } else {
        const doc = docFor(pdfDocsRef, page);
        if (!doc) return;
        const pdfPage = await doc.getPage(page.pageNumber);
        const viewport = pdfPage.getViewport({ scale: MAIN_SCALE, rotation: page.rotation });
        if (cancelled) return;
        w = viewport.width;
        h = viewport.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      }
      if (cancelled) return;
      applyPageFilter(canvas.getContext("2d"), canvas, pageFilter, 1); // background only, same as Export
      setCanvasSize({ width: w, height: h });
    })();
    return () => { cancelled = true; };
  }, [page && page.key, page && page.rotation, pageFilter]);

  return { canvasRef, canvasSize };
}

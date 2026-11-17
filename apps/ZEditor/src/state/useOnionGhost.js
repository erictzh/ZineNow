// The onion-skin ghost: a rendered image of the previous page, shown faintly over the current one.

import { MAIN_SCALE } from "../constants.js";
import { DEFAULT_PAGE_FILTER } from "../model/pageFilters.js";
import { renderPageToCanvas } from "../render/pageRender.js";

const { useState, useEffect } = React;

// Builds the onion-skin ghost from the previous page's full composite
// (background + its own annotations, via the same renderPageToCanvas
// export uses) at MAIN_SCALE, using that previous page's OWN filter
// (each page carries its own now). Deliberately NOT re-run on every
// `pages` change — that would refire on every drag mousemove anywhere
// in the document — only when the toggle or selected page changes, so
// editing (or re-filtering) the previous page won't refresh its ghost
// until you navigate away and back to the current one.
export function useOnionGhost({ onionSkinOn, pages, selectedIdx, pdfDocsRef }) {
  const [onionGhostSrc, setOnionGhostSrc] = useState(null);

  useEffect(() => {
    if (!onionSkinOn || selectedIdx === null || selectedIdx === 0) { setOnionGhostSrc(null); return; }
    const prevPage = pages[selectedIdx - 1];
    if (!prevPage) { setOnionGhostSrc(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const canvas = await renderPageToCanvas(prevPage, pdfDocsRef, MAIN_SCALE, prevPage.filter || DEFAULT_PAGE_FILTER);
        if (!cancelled) setOnionGhostSrc(canvas.toDataURL());
      } catch (err) {
        if (!cancelled) setOnionGhostSrc(null);
      }
    })();
    return () => { cancelled = true; };
  }, [onionSkinOn, selectedIdx]);

  return onionGhostSrc;
}
